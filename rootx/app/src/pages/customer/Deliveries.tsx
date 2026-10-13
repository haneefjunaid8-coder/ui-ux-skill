import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Package, Repeat as RepeatIcon } from 'lucide-react';
import { Button, Card, EmptyState, Tabs } from '../../ds';
import { useRootX, useDispatchRootX, currentUser, myDeliveries } from '../../engine/store';
import { DeliveryStatusPill, Money, fmtDay, fmtTime } from '../../components/bits';

export default function Deliveries() {
  const state = useRootX();
  const navigate = useNavigate();
  const user = currentUser(state)!;
  const all = myDeliveries(state, user.id);
  const now = state.clock.epoch;

  const active = all.filter((d) => !['delivered', 'cancelled'].includes(d.status));
  const history = all.filter((d) => ['delivered', 'cancelled'].includes(d.status));
  const scheduled = all.filter((d) => d.kind === 'scheduled' && d.status === 'awaiting_rider');
  const plans = state.recurring.filter((r) => all.some((d) => d.id === r.deliveryId));

  const [tab, setTab] = useState<'active' | 'scheduled' | 'recurring' | 'history'>('active');

  return (
    <div className="stack-lg" style={{ maxWidth: 640, marginInline: 'auto' }}>
      <h1>Deliveries</h1>
      <Tabs
        ariaLabel="Delivery lists"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'active', label: 'Active', count: active.length },
          { value: 'scheduled', label: 'Scheduled', count: scheduled.length },
          { value: 'recurring', label: 'Recurring', count: plans.length },
          { value: 'history', label: 'History', count: history.length },
        ]}
      />

      {tab === 'active' && (
        active.length === 0 ? (
          <Card><EmptyState title="No active deliveries" body="Your live deliveries will appear here with rider location and verification codes." /></Card>
        ) : (
          <div className="stack-sm">
            {active.map((d) => (
              <Card key={d.id} onClick={() => navigate(`/deliveries/${d.id}`)} className="stack-sm">
                <div className="row-between">
                  <span className="mono" style={{ fontWeight: 700 }}>{d.ref}</span>
                  <DeliveryStatusPill status={d.status} />
                </div>
                <div className="row" style={{ gap: 8, fontSize: 'var(--text-sm)', color: 'var(--ink-2)' }}>
                  <Package size={14} /> {d.package.description.slice(0, 48)}
                </div>
                <div className="row-between faint" style={{ fontSize: 'var(--text-xs)' }}>
                  <span>{d.stops[0].label} → {d.stops[d.stops.length - 1].label}</span>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {tab === 'scheduled' && (
        scheduled.length === 0 ? (
          <Card><EmptyState icon={CalendarClock} title="Nothing scheduled" body="Book a delivery for a future slot — it will dispatch automatically at the scheduled time." /></Card>
        ) : (
          <div className="stack-sm">
            {scheduled.map((d) => (
              <Card key={d.id} onClick={() => navigate(`/deliveries/${d.id}`)} className="stack-sm">
                <div className="row-between">
                  <span className="mono" style={{ fontWeight: 700 }}>{d.ref}</span>
                  <span className="pill pill-wait">Scheduled</span>
                </div>
                <div className="row-between" style={{ fontSize: 'var(--text-sm)' }}>
                  <span className="muted">{d.stops[0].label} → {d.stops[d.stops.length - 1].label}</span>
                  <Money value={d.quote.total} />
                </div>
                <div className="faint mono" style={{ fontSize: 'var(--text-xs)' }}>
                  {fmtDay(d.scheduledFor ?? d.createdAt, now)} · {fmtTime(d.scheduledFor ?? d.createdAt)} — auto-dispatch
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {tab === 'recurring' && (
        plans.length === 0 ? (
          <Card><EmptyState icon={RepeatIcon} title="No recurring plans" body="Set up a weekly provisions or documents run — occurrences are created automatically and paid from your wallet." /></Card>
        ) : (
          <div className="stack-sm">
            {plans.map((p) => {
              const template = state.deliveries.find((d) => d.id === p.deliveryId);
              return (
                <Card key={p.id} className="stack-sm">
                  <div className="row-between">
                    <div className="row" style={{ gap: 8 }}>
                      <RepeatIcon size={16} style={{ color: 'var(--root-700)' }} />
                      <strong style={{ fontSize: 'var(--text-sm)' }}>
                        {template?.stops[0].label} → {template?.stops[template.stops.length - 1].label}
                      </strong>
                    </div>
                    <span className={`pill ${p.active ? 'pill-go' : 'pill-hold'}`}>{p.active ? 'Active' : 'Paused'}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                    {p.days.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(' · ')} at {p.time}
                  </div>
                  <div className="faint mono" style={{ fontSize: 'var(--text-xs)' }}>
                    Next: {fmtDay(p.nextOccurrence, now)} {fmtTime(p.nextOccurrence)} · {p.occurrences.length} past occurrence(s)
                  </div>
                  <RecurringControls planId={p.id} active={p.active} />
                </Card>
              );
            })}
          </div>
        )
      )}

      {tab === 'history' && (
        history.length === 0 ? (
          <Card><EmptyState title="No history yet" body="Completed and cancelled deliveries live here with receipts and ratings." /></Card>
        ) : (
          <div className="stack-sm">
            {history.map((d) => (
              <Card key={d.id} onClick={() => navigate(`/deliveries/${d.id}`)} className="stack-sm">
                <div className="row-between">
                  <span className="mono" style={{ fontWeight: 700 }}>{d.ref}</span>
                  <DeliveryStatusPill status={d.status} />
                </div>
                <div className="row-between faint" style={{ fontSize: 'var(--text-xs)' }}>
                  <span>{fmtDay(d.createdAt, now)} · {d.stops[0].label} → {d.stops[d.stops.length - 1].label}</span>
                  <Money value={d.payment?.amount ?? d.quote.total} />
                </div>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}

export function RecurringControls({ planId, active }: { planId: string; active: boolean }) {
  const dispatch = useDispatchRootX();
  return (
    <div className="row wrap" style={{ gap: 8 }}>
      <Button variant="secondary" size="sm" onClick={() => dispatch({ type: 'recurring/update', planId, patch: { active: !active } })}>
        {active ? 'Pause plan' : 'Resume plan'}
      </Button>
      <Button variant="secondary" size="sm" onClick={() => dispatch({ type: 'recurring/update', planId, patch: {}, skipNext: true })}>
        Skip next
      </Button>
      <Button variant="quiet-danger" size="sm" onClick={() => dispatch({ type: 'recurring/update', planId, patch: { active: false, days: [] } })}>
        Cancel plan
      </Button>
    </div>
  );
}
