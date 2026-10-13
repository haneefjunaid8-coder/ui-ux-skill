import React from 'react';
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import type { Delivery } from '../engine/types';
import { STATUS_META } from './bits';
import { fmtDay, fmtTime } from './bits';

/* ============================================================================
   TrackingTimeline — the vertical route-thread. Milestones read like campus
   checkpoints on a dashed path: done nodes are filled, the current node
   pulses, future nodes are hollow. Timestamps in mono.
   ========================================================================== */

interface Milestone {
  key: string;
  label: string;
  at?: number;
  note?: string;
  state: 'done' | 'current' | 'future' | 'bad';
}

function deriveMilestones(d: Delivery, now: number): Milestone[] {
  const hist = [...d.statusHistory].sort((a, b) => a.at - b.at);
  const find = (s: string) => hist.find((h) => h.status === s);
  const created = hist[0];
  const paid = find('awaiting_rider') ?? find('payment_processing');
  const assigned = find('rider_assigned');
  const atPickup = find('at_pickup');
  const collected = find('package_collected');
  const inTransit = find('in_transit');
  const delivered = find('delivered');
  const cancelled = hist.find((h) => h.status === 'cancelled');

  const ms: Milestone[] = [
    { key: 'created', label: 'Request created', at: created?.at ?? d.createdAt, state: 'done' },
    {
      key: 'paid',
      label: 'Payment confirmed',
      at: paid?.at,
      state: paid ? 'done' : d.status === 'awaiting_payment' || d.status === 'payment_processing' ? 'current' : 'future',
      note: d.payment ? undefined : 'Pending',
    },
    { key: 'assigned', label: 'Rider assigned', at: assigned?.at, state: assigned ? 'done' : ['awaiting_rider', 'offered_to_riders'].includes(d.status) ? 'current' : 'future' },
    { key: 'atpickup', label: 'Rider at pickup', at: atPickup?.at, state: atPickup ? 'done' : ['rider_assigned', 'rider_approaching_pickup'].includes(d.status) ? 'current' : 'future' },
    { key: 'collected', label: 'Package collected & verified', at: collected?.at, state: collected ? 'done' : ['at_pickup', 'pickup_verification_pending'].includes(d.status) ? 'current' : 'future' },
    { key: 'transit', label: 'In transit', at: inTransit?.at, state: inTransit ? 'done' : ['package_collected'].includes(d.status) ? 'current' : 'future' },
    {
      key: 'delivered',
      label: 'Delivered & verified',
      at: delivered?.at,
      state: delivered ? 'done' : ['in_transit', 'approaching_destination', 'delivery_verification_pending', 'return_required'].includes(d.status) ? 'current' : 'future',
    },
  ];
  if (cancelled) {
    ms.push({ key: 'cancelled', label: 'Cancelled', at: cancelled.at, note: d.cancelReason ?? undefined, state: 'bad' });
  }
  return ms;
}

export function TrackingTimeline({ d, now }: { d: Delivery; now: number }) {
  const ms = deriveMilestones(d, now);
  return (
    <ol style={{ listStyle: 'none', padding: 0, margin: 0 }} aria-label="Delivery progress">
      {ms.map((m, i) => (
        <li key={m.key} style={{ display: 'flex', gap: 14, position: 'relative' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 26 }}>
            {m.state === 'bad' ? (
              <XCircle size={26} color="var(--alert-600)" strokeWidth={2} />
            ) : m.state === 'done' ? (
              <CheckCircle2 size={26} color="var(--root-600)" strokeWidth={2} />
            ) : m.state === 'current' ? (
              <span style={{ position: 'relative', display: 'flex' }}>
                <Loader2 size={26} color="var(--adire-600)" className="spin" style={{ animation: 'spin 2.4s linear infinite' }} />
              </span>
            ) : (
              <Circle size={26} color="var(--earth-300)" strokeWidth={2} />
            )}
            {i < ms.length - 1 && (
              <div
                aria-hidden="true"
                style={{
                  width: 0,
                  flex: 1,
                  minHeight: 30,
                  borderLeft: '2.5px dashed',
                  borderColor: m.state === 'done' ? 'var(--root-400)' : 'var(--earth-300)',
                  marginTop: 3,
                  marginBottom: 3,
                }}
              />
            )}
          </div>
          <div style={{ paddingBottom: i < ms.length - 1 ? 18 : 0, minWidth: 0 }}>
            <div
              style={{
                fontWeight: m.state === 'future' ? 500 : 700,
                color: m.state === 'future' ? 'var(--ink-3)' : m.state === 'bad' ? 'var(--alert-700)' : 'var(--ink)',
                fontSize: 'var(--text-base)',
              }}
            >
              {m.label}
            </div>
            {m.at != null && (
              <div className="mono faint" style={{ fontSize: 'var(--text-xs)', marginTop: 1 }}>
                {fmtDay(m.at, now)} · {fmtTime(m.at)}
              </div>
            )}
            {m.note && (
              <div className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 2 }}>
                {m.note}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Raw status history list (audit-style, used in detail + admin views). */
export function StatusHistoryList({ d, now }: { d: Delivery; now: number }) {
  const hist = [...d.statusHistory].sort((a, b) => a.at - b.at);
  return (
    <div className="stack-sm" style={{ fontSize: 'var(--text-sm)' }}>
      {hist.map((h, i) => {
        const meta = STATUS_META[h.status];
        return (
          <div key={i} className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
            <span className="mono faint" style={{ fontSize: 'var(--text-xs)', flexShrink: 0, width: 110 }}>
              {fmtTime(h.at)}
            </span>
            <span style={{ fontWeight: 600 }}>
              <meta.icon size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
              {meta.label}
            </span>
            {h.note && <span className="muted grow">{h.note}</span>}
          </div>
        );
      })}
    </div>
  );
}
