import React, { useState } from 'react';
import { AlertTriangle, LifeBuoy, ShieldAlert } from 'lucide-react';
import { Banner, Button, Card, Field, Modal, TextArea, TextInput, Toggle, useToast } from '../../ds';
import { useRootX, useDispatchRootX, currentUser } from '../../engine/store';
import { Money, fmtDay, fmtTime } from '../../components/bits';
import type { Dispute, Incident } from '../../engine/types';

export default function AdminCases() {
  const state = useRootX();
  const dispatch = useDispatchRootX();
  const toast = useToast();
  const actor = currentUser(state)!;
  const now = state.clock.epoch;
  const [openCase, setOpenCase] = useState<Dispute | null>(null);
  const [outcome, setOutcome] = useState('Refund customer — packaging damage confirmed');
  const [refund, setRefund] = useState(0);
  const [fromRider, setFromRider] = useState(true);
  const [note, setNote] = useState('');
  const [incidentNote, setIncidentNote] = useState<Record<string, string>>({});

  const disputes = state.disputes;
  const incidents = state.incidents;

  return (
    <div className="stack-lg">
      <div>
        <h1>Cases &amp; safety</h1>
        <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          Disputes and safety incidents get human review with evidence: verification records, photos, timestamps, route history
          and communications. Reports never trigger automatic penalties.
        </p>
      </div>

      <section className="stack">
        <h2 style={{ fontSize: 'var(--text-lg)' }}>Disputes</h2>
        <div className="table-wrap scroll-x">
          <table className="table">
            <thead>
              <tr>
                <th>Case</th>
                <th>Delivery</th>
                <th>Reason</th>
                <th>Opened</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((c) => (
                <tr key={c.id}>
                  <td className="mono" style={{ fontWeight: 700 }}>{c.id.toUpperCase()}</td>
                  <td className="mono">{c.deliveryId}</td>
                  <td style={{ maxWidth: 220, fontSize: 'var(--text-xs)' }}>{c.reason}</td>
                  <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>{fmtDay(c.openedAt, now)}</td>
                  <td>
                    <span className={`pill ${c.status === 'resolved' ? 'pill-go' : c.status === 'under_review' ? 'pill-wait' : 'pill-hold'}`}>{c.status.replace('_', ' ')}</span>
                  </td>
                  <td>
                    {c.status !== 'resolved' && (
                      <Button size="sm" variant="secondary" onClick={() => { setOpenCase(c); setRefund(state.deliveries.find((d) => d.id === c.deliveryId)?.payment?.amount ?? 0); }}>
                        Review
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="stack">
        <h2 style={{ fontSize: 'var(--text-lg)' }}>Safety incidents {incidents.some((i) => i.status !== 'resolved') && <span className="pill pill-alert" style={{ marginLeft: 6 }}>needs attention</span>}</h2>
        {incidents.map((i) => {
          const rider = state.riders.find((r) => r.id === i.riderId);
          return (
            <Card key={i.id} className="stack-sm" style={{ borderColor: i.status !== 'resolved' ? 'var(--alert-200)' : undefined }}>
              <div className="row-between">
                <div className="row" style={{ gap: 8 }}>
                  <ShieldAlert size={16} style={{ color: 'var(--alert-600)' }} />
                  <strong>{i.kind.replace('_', ' ')} · {i.id.toUpperCase()}</strong>
                </div>
                <span className={`pill ${i.status === 'resolved' ? 'pill-go' : 'pill-alert'}`}>{i.status}</span>
              </div>
              <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                {i.note} — rider {rider?.userId ? state.users.find((u) => u.id === rider.userId)?.name : 'Kofi M.'}
                {i.deliveryId && ` · during ${state.deliveries.find((d) => d.id === i.deliveryId)?.ref ?? ''}`}
              </div>
              <div className="faint mono" style={{ fontSize: 'var(--text-xs)' }}>opened {fmtDay(i.openedAt, now)} {fmtTime(i.openedAt)}</div>
              <div className="stack-sm">
                {i.events.map((e, j) => (
                  <div key={j} style={{ fontSize: 'var(--text-sm)', borderLeft: '2.5px dashed var(--earth-300)', paddingLeft: 10 }}>
                    <span className="faint mono" style={{ fontSize: 'var(--text-xs)' }}>{fmtTime(e.at)} · {e.by}</span>
                    <div>{e.note}</div>
                  </div>
                ))}
              </div>
              {i.status !== 'resolved' && (
                <div className="row" style={{ gap: 8 }}>
                  <TextInput
                    value={incidentNote[i.id] ?? ''}
                    onChange={(e) => setIncidentNote({ ...incidentNote, [i.id]: e.target.value })}
                    placeholder="Resolution note (audited)…"
                    aria-label="Resolution note"
                  />
                  <Button
                    size="sm"
                    disabled={!(incidentNote[i.id] ?? '').trim()}
                    onClick={() => {
                      dispatch({ type: 'admin/resolveIncident', incidentId: i.id, note: incidentNote[i.id] });
                      toast('Incident resolved — safety-related, no rider penalty.', 'success');
                    }}
                  >
                    Resolve
                  </Button>
                </div>
              )}
              <Banner tone="info" icon={LifeBuoy}>
                Safety findings are kept separate from customer-satisfaction ratings and never auto-penalise riders.
              </Banner>
            </Card>
          );
        })}
      </section>

      <Modal
        open={!!openCase}
        onClose={() => setOpenCase(null)}
        title={`Resolve ${openCase?.id.toUpperCase() ?? ''}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpenCase(null)}>Cancel</Button>
            <Button
              disabled={!note.trim()}
              onClick={() => {
                if (!openCase) return;
                dispatch({ type: 'admin/resolveDispute', caseId: openCase.id, outcome, refundAmount: refund, fromRiderShare: fromRider, note });
                toast('Case resolved. Refund credited to wallet and ledger adjusted.', 'success');
                setOpenCase(null);
                setNote('');
              }}
            >
              Resolve case
            </Button>
          </>
        }
      >
        {openCase && (
          <div className="stack">
            <Card className="stack-sm card-tint">
              <div className="kv"><span className="kv-key">Reason</span><span className="kv-val">{openCase.reason}</span></div>
              <div className="kv"><span className="kv-key">Description</span><span className="kv-val" style={{ fontWeight: 400 }}>{openCase.description}</span></div>
              <div className="kv"><span className="kv-key">Delivery</span><span className="kv-val mono">{openCase.deliveryId}</span></div>
              {(() => {
                const d = state.deliveries.find((x) => x.id === openCase.deliveryId);
                return d?.ledger ? (
                  <div className="kv"><span className="kv-key">Ledger</span><span className="kv-val mono" style={{ fontSize: 'var(--text-xs)' }}>charge {d.ledger.charge} · rider net {d.ledger.riderNet} · settlement {d.ledger.settlement}</span></div>
                ) : null;
              })()}
            </Card>
            <Banner tone="warn" icon={AlertTriangle}>
              Evidence attached: pickup/delivery verification timestamps, package photos, route history, status timeline. Review
              before deciding — both parties can appeal.
            </Banner>
            <Field label="Outcome">
              <select className="select" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                <option>Refund customer — packaging damage confirmed</option>
                <option>Refund customer — service failure, rider not at fault</option>
                <option>No action — claim not supported by evidence</option>
                <option>Rider warning issued (separate from ratings)</option>
                <option>Escalated — security review required</option>
              </select>
            </Field>
            <Field label="Refund amount (₦, to customer wallet)" hint="Splits per policy: choose whether the rider share is deducted.">
              <TextInput type="number" value={refund} min={0} onChange={(e) => setRefund(Math.max(0, Number(e.target.value)))} />
            </Field>
            <label className="row-between" style={{ fontSize: 'var(--text-sm)' }}>
              <span>Deduct rider share of refund (rider at fault)</span>
              <Toggle checked={fromRider} onChange={setFromRider} label="Deduct rider share" />
            </label>
            <Field label="Resolution note (required — stored in the case record)" required>
              <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reasoning, evidence considered, decision rationale" />
            </Field>
            <p className="faint" style={{ fontSize: 'var(--text-xs)' }}>
              Recorded as {actor.name} · dispute.resolve · {openCase.id}. Refund impact: <Money value={refund} />.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
