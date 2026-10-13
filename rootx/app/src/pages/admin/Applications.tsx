import React, { useState } from 'react';
import { BadgeCheck, Ban, FileQuestion, ShieldCheck } from 'lucide-react';
import { Banner, Button, Card, Field, Modal, TextArea, useToast } from '../../ds';
import { useRootX, useDispatchRootX, currentUser } from '../../engine/store';
import { fmtDay, fmtTime } from '../../components/bits';
import type { RiderApplication } from '../../engine/types';

export default function AdminApplications() {
  const state = useRootX();
  const dispatch = useDispatchRootX();
  const toast = useToast();
  const actor = currentUser(state)!;
  const [openApp, setOpenApp] = useState<RiderApplication | null>(null);
  const [decision, setDecision] = useState<'approved' | 'rejected' | 'info_required' | 'suspended'>('approved');
  const [reason, setReason] = useState('');

  const apps = [...state.applications].sort((a, b) => b.submittedAt - a.submittedAt);
  const queue = apps.filter((a) => ['submitted', 'under_review', 'info_required'].includes(a.status));

  function review() {
    if (!openApp) return;
    if (!reason.trim()) return toast('A review reason is required for the audit trail.', 'warn');
    dispatch({ type: 'admin/reviewApplication', applicationId: openApp.id, decision, reason });
    toast(`Application ${decision.replace('_', ' ')} — audit entry recorded.`, 'success');
    setOpenApp(null);
    setReason('');
  }

  return (
    <div className="stack-lg">
      <div>
        <h1>Rider applications</h1>
        <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          Manual review is mandatory. Check the matriculation number against university records, verify the student ID document,
          and confirm the emergency contact. Approving creates the rider profile; rejecting requires a reason.
        </p>
      </div>

      {queue.length === 0 && <Banner tone="success" icon={BadgeCheck}>Queue is clear — no applications awaiting review.</Banner>}

      <div className="table-wrap scroll-x">
        <table className="table">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Matric no.</th>
              <th>Transport</th>
              <th>Zone</th>
              <th>Submitted</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {apps.map((a) => (
              <tr key={a.id}>
                <td>
                  <strong>{a.fullName}</strong>
                  <span className="faint" style={{ display: 'block', fontSize: 'var(--text-xs)' }}>{a.phone}</span>
                </td>
                <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>{a.matricNumber}</td>
                <td>{a.transport}</td>
                <td>{a.zoneId.replace(/-/g, ' ')}</td>
                <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>
                  {fmtDay(a.submittedAt, state.clock.epoch)} {fmtTime(a.submittedAt)}
                </td>
                <td>
                  <span className={`pill ${a.status === 'approved' ? 'pill-go' : a.status === 'rejected' || a.status === 'suspended' ? 'pill-alert' : 'pill-wait'}`}>
                    {a.status.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  <Button size="sm" variant="secondary" onClick={() => setOpenApp(a)}>
                    Review
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!openApp}
        onClose={() => setOpenApp(null)}
        title={`Review — ${openApp?.fullName ?? ''}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpenApp(null)}>Close</Button>
            <Button variant="primary" onClick={review} disabled={!reason.trim()}>
              Confirm decision
            </Button>
          </>
        }
      >
        {openApp && (
          <div className="stack">
            <Card className="stack-sm card-tint">
              <div className="kv"><span className="kv-key">Matriculation number</span><span className="kv-val mono">{openApp.matricNumber}</span></div>
              <div className="kv"><span className="kv-key">Phone (verified)</span><span className="kv-val mono">{openApp.phone}</span></div>
              <div className="kv"><span className="kv-key">Emergency contact</span><span className="kv-val">{openApp.emergencyContact.name} · {openApp.emergencyContact.relationship} · {openApp.emergencyContact.phone}</span></div>
              <div className="kv"><span className="kv-key">Transport</span><span className="kv-val">{openApp.transport}</span></div>
              <div className="kv"><span className="kv-key">Terms accepted</span><span className="kv-val">{fmtDay(openApp.termsAcceptedAt, state.clock.epoch)} {fmtTime(openApp.termsAcceptedAt)}</span></div>
            </Card>

            <div>
              <div className="data-label" style={{ marginBottom: 6 }}>Student ID document (private storage)</div>
              <img src={openApp.studentIdDoc} alt="Student ID card" style={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 12, border: '1px solid var(--line)' }} />
              <p className="faint" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                Access to this document is logged. It is never exposed to customers.
              </p>
            </div>

            {openApp.reviewNotes.length > 0 && (
              <div className="stack-sm">
                <div className="data-label">Previous review notes</div>
                {openApp.reviewNotes.map((n, i) => (
                  <div key={i} className="card card-tint" style={{ padding: 10, fontSize: 'var(--text-sm)' }}>
                    <span className="faint mono" style={{ fontSize: 'var(--text-xs)' }}>{fmtDay(n.at, state.clock.epoch)} · {n.by} · {n.decision}</span>
                    <div>{n.note}</div>
                  </div>
                ))}
              </div>
            )}

            <Banner tone="info" icon={ShieldCheck}>
              Duplicate-account detection: matriculation numbers are unique across applications — duplicates are auto-flagged and
              block re-application from other accounts.
            </Banner>

            <Field label="Decision" required>
              <div className="segmented" role="tablist" aria-label="Decision">
                {([
                  { v: 'approved', l: 'Approve', icon: BadgeCheck },
                  { v: 'info_required', l: 'Need info', icon: FileQuestion },
                  { v: 'rejected', l: 'Reject', icon: Ban },
                  { v: 'suspended', l: 'Suspend', icon: Ban },
                ] as const).map((o) => (
                  <button key={o.v} role="tab" aria-selected={decision === o.v} className="segment" onClick={() => setDecision(o.v)}>
                    {o.l}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Reason (required — stored in the audit trail)" required>
              <TextArea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Matric number verified against faculty records; ID legible." />
            </Field>
            <p className="faint" style={{ fontSize: 'var(--text-xs)' }}>
              Recorded as {actor.name} · decision · {openApp.id} with timestamps and before/after states.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
