import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarClock, Package, Plus, Repeat, Star, Wallet } from 'lucide-react';
import { Button, Card, EmptyState } from '../../ds';
import { useRootX, currentUser, myDeliveries, serviceWindowNow, activeZones } from '../../engine/store';
import { Banner, type IconType } from '../../ds';
import { DeliveryStatusPill, Money, fmtDay, fmtTime } from '../../components/bits';
import { OSOGBO_CAMPUS, OKE_BAAALE } from '../../engine/zones';

export default function CustomerHome() {
  const state = useRootX();
  const navigate = useNavigate();
  const user = currentUser(state)!;
  const deliveries = myDeliveries(state, user.id);
  const w = serviceWindowNow(state, 25);
  const zones = activeZones(state).filter((z) => ['osogbo-campus', 'oke-baale'].includes(z.id));

  const active = deliveries.filter((d) => !['delivered', 'cancelled'].includes(d.status));
  const recent = deliveries.filter((d) => d.status === 'delivered').slice(0, 2);
  const scheduled = deliveries.filter((d) => d.kind === 'scheduled' && d.status === 'awaiting_rider');
  const recurring = state.recurring.filter((r) => r.deliveryId && deliveries.some((d) => d.id === r.deliveryId));
  const hour = new Date(state.clock.epoch).getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="stack-lg" style={{ maxWidth: 640, marginInline: 'auto' }}>
      <div className="row-between" style={{ alignItems: 'flex-end' }}>
        <div>
          <div className="data-label">{greet}</div>
          <h1 style={{ fontSize: 'var(--text-2xl)' }}>{user.name.split(' ')[0]} 👋</h1>
        </div>
        <Link to="/wallet" className="card row" style={{ gap: 10, padding: '10px 14px', textDecoration: 'none', color: 'inherit' }}>
          <Wallet size={18} style={{ color: 'var(--root-700)' }} />
          <span className="mono" style={{ fontWeight: 700 }}>
            <Money value={user.walletBalance} />
          </span>
        </Link>
      </div>

      {w.phase !== 'open' && (
        <Banner tone={w.phase === 'closed' ? 'danger' : 'warn'} title={w.phase === 'closed' ? 'Service is closed' : w.phase === 'cutoff' ? 'Last calls are over for today' : '6 PM safety notice'}>
          {w.message}
        </Banner>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <QuickAction to="/new" icon={Plus} title="Send a package" sub="From ₦700 · intra-zone" primary />
        <QuickAction to="/deliveries" icon={CalendarClock} title="Scheduled" sub={`${scheduled.length} upcoming`} />
        <QuickAction to="/deliveries" icon={Repeat} title="Recurring" sub={recurring.length ? `${recurring.length} active plan` : 'Set up a run'} />
      </div>

      {/* service area */}
      <Card className="stack-sm">
        <div className="row-between">
          <div className="data-label">Your service area</div>
          <span className="pill pill-go">Active</span>
        </div>
        <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          {zones.map((z) => z.name).join(' · ')} — deliveries stay inside approved campus and township zones.
        </div>
        <Link to="/profile" className="mono" style={{ fontSize: 'var(--text-xs)' }}>
          View saved locations →
        </Link>
      </Card>

      {/* active deliveries */}
      <section className="stack">
        <div className="row-between">
          <h2 style={{ fontSize: 'var(--text-lg)' }}>Active</h2>
          <Link to="/deliveries" style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
            All deliveries →
          </Link>
        </div>
        {active.length === 0 ? (
          <Card>
            <EmptyState
              title="Nothing on the road"
              body="When you send a package, its live status appears here — with rider location and verification codes."
              action={
                <Button icon={Plus} onClick={() => navigate('/new')} disabled={!w.allowNewBooking}>
                  New delivery
                </Button>
              }
            />
          </Card>
        ) : (
          active.map((d) => <ActiveDeliveryCard key={d.id} id={d.id} />)
        )}
      </section>

      {recent.length > 0 && (
        <section className="stack">
          <h2 style={{ fontSize: 'var(--text-lg)' }}>Recently delivered</h2>
          {recent.map((d) => (
            <Card key={d.id} onClick={() => navigate(`/deliveries/${d.id}`)} className="stack-sm">
              <div className="row-between">
                <span className="mono" style={{ fontWeight: 700 }}>{d.ref}</span>
                <DeliveryStatusPill status={d.status} />
              </div>
              <div className="row" style={{ gap: 8, fontSize: 'var(--text-sm)', color: 'var(--ink-2)' }}>
                <Package size={14} /> {d.package.description.slice(0, 44)}
              </div>
              <div className="row-between faint" style={{ fontSize: 'var(--text-xs)' }}>
                <span>{fmtDay(d.createdAt, state.clock.epoch)} · {fmtTime(d.createdAt)}</span>
                {d.rating && (
                  <span className="row" style={{ gap: 4 }}>
                    <Star size={12} color="var(--dusk-500)" fill="var(--dusk-500)" /> {d.rating.stars}.0
                  </span>
                )}
              </div>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}

function QuickAction({ to, icon: Icon, title, sub, primary }: { to: string; icon: IconType; title: string; sub: string; primary?: boolean }) {
  return (
    <Link
      to={to}
      className="card"
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        padding: 14,
        textDecoration: 'none',
        color: 'inherit',
        background: primary ? 'var(--root-600)' : undefined,
        borderColor: primary ? 'var(--root-700)' : undefined,
      }}
    >
      <span
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: primary ? 'oklch(1 0 0 / 0.1)' : 'var(--root-950)',
          color: primary ? 'white' : 'var(--root-700)',
          flexShrink: 0,
        }}
      >
        <Icon size={19} />
      </span>
      <span>
        <span style={{ display: 'block', fontWeight: 700, color: primary ? 'white' : 'var(--ink)' }}>{title}</span>
        <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: primary ? 'oklch(0.98 0.005 258)' : 'var(--ink-3)' }}>{sub}</span>
      </span>
    </Link>
  );
}

function ActiveDeliveryCard({ id }: { id: string }) {
  const state = useRootX();
  const navigate = useNavigate();
  const d = state.deliveries.find((x) => x.id === id)!;
  const rider = state.riders.find((r) => r.id === d.riderId);
  const stale = d.riderLocation ? state.clock.epoch - d.riderLocation.updatedAt > 60_000 : false;
  const remaining = d.status === 'in_transit' || d.status === 'approaching_destination' ? Math.max(1, Math.round(d.route.etaMinutes * (1 - d.riderProgress))) : d.route.etaMinutes;

  return (
    <Card onClick={() => navigate(`/deliveries/${d.id}`)} className="stack-sm">
      <div className="row-between">
        <span className="mono" style={{ fontWeight: 700 }}>{d.ref}</span>
        <DeliveryStatusPill status={d.status} />
      </div>
      <div className="stack-sm" style={{ fontSize: 'var(--text-sm)' }}>
        <div className="row" style={{ gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--root-600)', marginTop: 5, flexShrink: 0 }} />
          <span className="grow muted">{d.stops[0].label}</span>
        </div>
        <div aria-hidden="true" style={{ marginLeft: 3, borderLeft: '2.5px dashed var(--root-400)', height: 12, opacity: 0.6 }} />
        <div className="row" style={{ gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--adire-600)', marginTop: 5, flexShrink: 0 }} />
          <span className="grow muted">{d.stops[d.stops.length - 1].label}</span>
        </div>
      </div>
      {rider && (
        <div className="row-between" style={{ fontSize: 'var(--text-xs)' }}>
          <span className="faint">
            {rider.simulated ? 'Blessing A.' : 'Chidi O.'} · {rider.transport} {stale && <span style={{ color: 'var(--dusk-700)', fontWeight: 700 }}>· GPS stale</span>}
          </span>
          <span className="mono" style={{ fontWeight: 700 }}>
            ~{remaining} min
          </span>
        </div>
      )}
      <span className="row" style={{ fontSize: 'var(--text-sm)', color: 'var(--root-700)', fontWeight: 700 }}>
        Track <ArrowRight size={14} />
      </span>
    </Card>
  );
}

export { OSOGBO_CAMPUS, OKE_BAAALE };
