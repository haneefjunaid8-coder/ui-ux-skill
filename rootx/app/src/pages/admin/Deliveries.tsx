import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Banner, Button, Card, Field, Modal, Select, TextArea, TextInput, useToast } from '../../ds';
import { useRootX, useDispatchRootX, currentUser } from '../../engine/store';
import { StatusHistoryList } from '../../components/Timeline';
import { DeliveryStatusPill, Money, fmtDay, fmtTime } from '../../components/bits';
import { CANCELLABLE } from '../../engine/stateMachine';
import type { Delivery, DeliveryStatus } from '../../engine/types';

const STATUS_OPTIONS: (DeliveryStatus | 'all')[] = ['all', 'offered_to_riders', 'rider_assigned', 'in_transit', 'delivery_verification_pending', 'delivered', 'cancelled', 'disputed', 'return_required', 'awaiting_payment', 'awaiting_rider'];

export default function AdminDeliveries() {
  const state = useRootX();
  const dispatch = useDispatchRootX();
  const toast = useToast();
  const actor = currentUser(state)!;
  const now = state.clock.epoch;
  const [filter, setFilter] = useState<DeliveryStatus | 'all'>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Delivery | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const rows = useMemo(() => {
    return [...state.deliveries]
      .sort((a, b) => b.createdAt - a.createdAt)
      .filter((d) => (filter === 'all' ? true : d.status === filter))
      .filter((d) => (q ? (d.ref + d.stops[0].label + d.stops[d.stops.length - 1].label).toLowerCase().includes(q.toLowerCase()) : true));
  }, [state.deliveries, filter, q]);

  return (
    <div className="stack-lg">
      <div>
        <h1>Deliveries</h1>
        <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>Monitor active and historical runs. Admin cancellation requires a reason and is audited.</p>
      </div>

      <div className="row wrap" style={{ gap: 10 }}>
        <div className="row" style={{ minWidth: 220 }}>
          <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ref or location…" aria-label="Search deliveries" />
        </div>
        <Select value={filter} onChange={(e) => setFilter(e.target.value as DeliveryStatus | 'all')} aria-label="Filter by status" style={{ maxWidth: 260 }}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All statuses' : s.replace(/_/g, ' ')}</option>
          ))}
        </Select>
      </div>

      <div className="table-wrap scroll-x">
        <table className="table">
          <thead>
            <tr>
              <th>Ref</th>
              <th>Route</th>
              <th>Status</th>
              <th>Rider</th>
              <th>Charge</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => {
              const rider = state.riders.find((r) => r.id === d.riderId);
              return (
                <tr key={d.id}>
                  <td className="mono" style={{ fontWeight: 700 }}>{d.ref}</td>
                  <td style={{ maxWidth: 220 }}>
                    <span style={{ fontSize: 'var(--text-xs)' }}>{d.stops[0].label} → {d.stops[d.stops.length - 1].label}</span>
                  </td>
                  <td><DeliveryStatusPill status={d.status} /></td>
                  <td style={{ fontSize: 'var(--text-xs)' }}>{rider ? (rider.userId ? state.users.find((u) => u.id === rider.userId)?.name?.split(' ')[0] : { 'r-kofi': 'Kofi', 'r-ibrahim': 'Ibrahim', 'r-blessing': 'Blessing' }[rider.id] ?? '—') : '—'}</td>
                  <td><Money value={d.payment?.amount ?? d.quote.total} /></td>
                  <td className="mono" style={{ fontSize: 'var(--text-xs)' }}>{fmtDay(d.createdAt, now)}</td>
                  <td>
                    <Button size="sm" variant="secondary" onClick={() => setOpen(d)}>Open</Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `${open.ref} — record` : ''} footer={<Button variant="ghost" onClick={() => setOpen(null)}>Close</Button>}>
        {open && (
          <div className="stack">
            <div className="row wrap" style={{ gap: 6 }}>
              <DeliveryStatusPill status={open.status} />
              <span className="pill pill-hold">{open.kind}</span>
              {open.safetyFlags.map((f) => (
                <span key={f} className="pill pill-alert">{f.replace(/_/g, ' ')}</span>
              ))}
            </div>
            <Card className="stack-sm card-tint">
              <div className="kv"><span className="kv-key">Customer</span><span className="kv-val">{state.users.find((u) => u.id === open.customerId)?.name}</span></div>
              <div className="kv"><span className="kv-key">Stops</span><span className="kv-val">{open.stops.map((s) => s.label).join(' → ')}</span></div>
              <div className="kv"><span className="kv-key">Package</span><span className="kv-val">{open.package.description} · {open.package.weightKg} kg · {open.package.sizeTier}</span></div>
              <div className="kv"><span className="kv-key">Payment</span><span className="kv-val">{open.payment ? `${open.payment.method} · ${open.payment.status} · ${open.payment.gatewayRef}` : 'unpaid'}</span></div>
              {open.ledger && (
                <div className="kv"><span className="kv-key">Ledger</span><span className="kv-val mono" style={{ fontSize: 'var(--text-xs)' }}>charge {open.ledger.charge} · fee {open.ledger.gatewayFee} · comm {open.ledger.commission} · rider {open.ledger.riderNet} · {open.ledger.settlement}</span></div>
              )}
              <div className="kv"><span className="kv-key">Tracking token</span><span className="kv-val mono" style={{ fontSize: 'var(--text-xs)' }}>{open.trackingToken.token.slice(0, 16)}… {open.trackingToken.revoked ? '(revoked)' : ''}</span></div>
            </Card>
            <div>
              <div className="data-label" style={{ marginBottom: 8 }}>Status history</div>
              <StatusHistoryList d={open} now={now} />
            </div>
            {CANCELLABLE.includes(open.status) && (
              <div className="stack-sm">
                <Field label="Admin cancellation (audited, reason required)">
                  <TextArea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="e.g. Matching failure after multiple rounds — customer informed and refunded" />
                </Field>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={!cancelReason.trim()}
                  onClick={() => {
                    dispatch({ type: 'delivery/cancel', deliveryId: open.id, reason: 'Admin: ' + cancelReason, by: actor.id, actorName: actor.name });
                    toast('Cancelled with audit entry and customer refund per policy.', 'success');
                    setOpen(null);
                    setCancelReason('');
                  }}
                >
                  Force cancel {open.ref}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {rows.length === 0 && <Banner tone="info" icon={Search}>No deliveries match the filter.</Banner>}
    </div>
  );
}
