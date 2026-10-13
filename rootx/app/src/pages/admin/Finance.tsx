import React from 'react';
import { AlertTriangle, Banknote, Check, FileSpreadsheet, X } from 'lucide-react';
import { Banner, Button, Card, Field, Modal, Stat, TextArea, TextInput, useToast } from '../../ds';
import { useRootX, useDispatchRootX, currentUser } from '../../engine/store';
import { Money, fmtDay, fmtTime } from '../../components/bits';
import { reconcile } from '../../engine/ledger';

export default function AdminFinance() {
  const state = useRootX();
  const dispatch = useDispatchRootX();
  const toast = useToast();
  const actor = currentUser(state)!;
  const now = state.clock.epoch;
  const [rejectFor, setRejectFor] = React.useState<string | null>(null);
  const [rejectReason, setRejectReason] = React.useState('');

  const ledgerRows = state.deliveries.filter((d) => d.ledger).map((d) => ({ ...d.ledger!, deliveryId: d.id, ref: d.ref, riderId: d.riderId }));
  const rec = reconcile(ledgerRows);
  const ready = state.deliveries.filter((d) => d.ledger?.settlement === 'ready');
  const batches = state.batches;

  function exportCsv() {
    const rows = [
      ['delivery', 'charge', 'gateway_fee', 'commission', 'adjustments', 'refunded', 'rider_net', 'settlement', 'payout'],
      ...ledgerRows.map((l) => [l.deliveryId, String(l.charge), String(l.gatewayFee), String(l.commission), String(l.adjustments.reduce((a, x) => a + x.amount, 0)), String(l.refunded), String(l.riderNet), l.settlement, l.payoutId ?? '']),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rootx-reconciliation.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="stack-lg">
      <div>
        <h1>Finance &amp; reconciliation</h1>
        <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          Every naira is accounted for: charge − gateway fee − commission − adjustments = rider net. Finance proposes settlement
          batches; admin approves them (two-person rule).
        </p>
      </div>

      {!rec.invariantsOk && (
        <Banner tone="danger" title="Reconciliation failure" icon={AlertTriangle}>
          {rec.rows.filter((r) => !r.ok).length} row(s) break the ledger invariant — freeze settlements and investigate.
        </Banner>
      )}

      <div className="metrics-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
        <Stat label="Gross charges" value={<Money value={rec.grossCharges} />} />
        <Stat label="Gateway fees" value={<Money value={rec.gatewayFees} />} />
        <Stat label="Commission" value={<Money value={rec.commissions} />} tone="go" />
        <Stat label="Rider net payable" value={<Money value={rec.riderNet} />} />
        <Stat label="Refunds" value={<Money value={rec.refunds} />} tone={rec.refunds > 0 ? 'wait' : undefined} />
      </div>

      <div className="row wrap" style={{ gap: 10 }}>
        {actor.role === 'finance' ? (
          <Button icon={Banknote} disabled={ready.length === 0} onClick={() => { dispatch({ type: 'admin/settlementRun' }); toast('Settlement batch proposed — admin approval required.', 'success'); }}>
            Run settlement ({ready.length} ready · <Money value={ready.reduce((a, d) => a + (d.ledger?.riderNet ?? 0) - (d.ledger?.refunded ?? 0), 0)} />)
          </Button>
        ) : (
          <Banner tone="info">
            Settlement runs are proposed by finance staff and approved by ops admin — the two-person rule. Log in as Mr. Adeyemi
            (Finance) to run one.
          </Banner>
        )}
        <Button variant="secondary" icon={FileSpreadsheet} onClick={exportCsv}>
          Export reconciliation (CSV)
        </Button>
      </div>

      {batches.length > 0 && (
        <Card className="stack-sm">
          <div className="data-label">Settlement batches</div>
          {batches.map((b) => (
            <div key={b.id} className="row-between" style={{ borderBottom: '1px solid var(--line-subtle)', paddingBottom: 8 }}>
              <div>
                <span className="mono" style={{ fontWeight: 700 }}>{b.id}</span>
                <span className="faint" style={{ display: 'block', fontSize: 'var(--text-xs)' }}>
                  {b.ledgerIds.length} rows · proposed {fmtDay(b.createdAt, now)} {fmtTime(b.createdAt)} by {state.users.find((u) => u.id === b.createdById)?.name}
                  {b.approvedById && ` · approved by ${state.users.find((u) => u.id === b.approvedById)?.name}`}
                </span>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <Money value={b.amount} />
                <span className={`pill ${b.status === 'approved' ? 'pill-go' : b.status === 'rejected' ? 'pill-alert' : 'pill-wait'}`}>{b.status.replace('_', ' ')}</span>
                {b.status === 'awaiting_approval' && actor.role === 'admin' && (
                  <>
                    <Button size="sm" icon={Check} onClick={() => { dispatch({ type: 'admin/approveSettlement', batchId: b.id }); toast('Batch approved — rider balances credited.', 'success'); }}>
                      Approve
                    </Button>
                    <Button size="sm" variant="quiet-danger" icon={X} onClick={() => setRejectFor(b.id)}>
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      <div className="table-wrap scroll-x">
        <table className="table">
          <thead>
            <tr>
              <th>Ref</th>
              <th>Charge</th>
              <th>Gateway fee</th>
              <th>Commission</th>
              <th>Adjustments</th>
              <th>Refunded</th>
              <th>Rider net</th>
              <th>Settlement</th>
              <th>✓</th>
            </tr>
          </thead>
          <tbody>
            {ledgerRows.map((l) => {
              const row = rec.rows.find((r) => r.deliveryId === l.deliveryId);
              return (
                <tr key={l.deliveryId}>
                  <td className="mono" style={{ fontWeight: 700 }}>{l.ref}</td>
                  <td className="mono">{l.charge.toLocaleString()}</td>
                  <td className="mono">{l.gatewayFee.toLocaleString()}</td>
                  <td className="mono">{l.commission.toLocaleString()}</td>
                  <td className="mono">{l.adjustments.reduce((a, x) => a + x.amount, 0).toLocaleString()}</td>
                  <td className="mono">{l.refunded.toLocaleString()}</td>
                  <td className="mono" style={{ fontWeight: 700 }}>{(l.riderNet - l.refunded).toLocaleString()}</td>
                  <td>
                    <span className={`pill ${l.settlement === 'settled' ? 'pill-go' : l.settlement === 'ready' ? 'pill-wait' : 'pill-hold'}`}>{l.settlement}</span>
                  </td>
                  <td>{row?.ok ? <Check size={14} style={{ color: 'var(--root-600)' }} /> : <AlertTriangle size={14} style={{ color: 'var(--alert-600)' }} />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Banner tone="info">
        Payout requests by riders appear after settlement approval and pass fraud checks and KYC per the payment provider's
        transfer rails. Demo values only — see docs/10-payments.md for the production reconciliation design.
      </Banner>

      <Modal
        open={!!rejectFor}
        onClose={() => setRejectFor(null)}
        title="Reject settlement batch"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectFor(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim()}
              onClick={() => {
                if (rejectFor) dispatch({ type: 'admin/rejectSettlement', batchId: rejectFor, reason: rejectReason });
                setRejectFor(null);
                setRejectReason('');
                toast('Batch rejected — rows returned to ready with audit entry.', 'warn');
              }}
            >
              Reject batch
            </Button>
          </>
        }
      >
        <Field label="Reason (required)" required>
          <TextArea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Ledger mismatch on d-102 — hold until dispute resolved" />
        </Field>
      </Modal>
    </div>
  );
}
