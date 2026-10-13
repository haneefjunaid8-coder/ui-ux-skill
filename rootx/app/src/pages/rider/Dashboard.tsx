import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Bike, Check, Clock, Package, Power, Star, X } from 'lucide-react';
import { Banner, Button, Card, Modal, Stat, TextArea, Toggle, useToast } from '../../ds';
import { useRootX, useDispatchRootX, currentUser, myRider, activeGuidanceNow, serviceWindowNow } from '../../engine/store';
import { Money, Money as M } from '../../components/bits';
import { eligibleRiders } from '../../engine/matching';

export default function RiderDashboard() {
  const state = useRootX();
  const dispatch = useDispatchRootX();
  const navigate = useNavigate();
  const toast = useToast();
  const user = currentUser(state)!;
  const rider = myRider(state);
  const now = state.clock.epoch;
  const w = serviceWindowNow(state, 25);
  const guidance = activeGuidanceNow(state);
  const [sosOpen, setSosOpen] = useState(false);
  const [sosNote, setSosNote] = useState('');

  if (!rider) {
    return (
      <div className="stack-lg" style={{ maxWidth: 640, marginInline: 'auto' }}>
        <Banner tone="info" title="No rider profile yet">
          Your account is registered, but only verified student riders can accept deliveries.
        </Banner>
        <Button onClick={() => navigate('/rider/apply')}>Apply to become a rider</Button>
      </div>
    );
  }

  const myOffers = state.deliveries.filter((d) => d.status === 'offered_to_riders' && d.offer?.offeredTo.includes(rider.id));
  const myActive = state.deliveries.filter(
    (d) => d.riderId === rider.id && ['rider_assigned', 'rider_approaching_pickup', 'at_pickup', 'pickup_verification_pending', 'package_collected', 'in_transit', 'approaching_destination', 'delivery_verification_pending', 'return_required'].includes(d.status),
  );
  const completedToday = state.deliveries.filter((d) => d.riderId === rider.id && d.status === 'delivered' && new Date(d.createdAt).toDateString() === new Date(now).toDateString());

  return (
    <div className="stack-lg" style={{ maxWidth: 640, marginInline: 'auto' }}>
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="data-label">Rider dashboard</div>
          <h1 style={{ fontSize: 'var(--text-2xl)' }}>{user.name.split(' ')[0]}</h1>
          <div className="row" style={{ gap: 6, marginTop: 4, fontSize: 'var(--text-sm)' }}>
            <Star size={14} color="var(--dusk-500)" fill="var(--dusk-500)" />
            <strong>{rider.rating.toFixed(2)}</strong>
            <span className="faint">· {rider.completed} deliveries · {Math.round(rider.onTimeRate * 100)}% on time</span>
          </div>
        </div>
        <Card style={{ padding: '10px 14px' }}>
          <div className="data-label">Available</div>
          <div className="row" style={{ gap: 8 }}>
            <Toggle checked={rider.isAvailable} onChange={(v) => dispatch({ type: 'rider/availability', riderId: rider.id, available: v })} label="Toggle availability" />
            <Power size={16} style={{ color: rider.isAvailable ? 'var(--root-600)' : 'var(--ink-4)' }} />
          </div>
        </Card>
      </div>

      {w.phase !== 'open' && (
        <Banner tone={w.phase === 'closed' ? 'danger' : 'warn'} title={w.phase === 'closed' ? 'Service closed' : w.phase === 'cutoff' ? 'Booking cutoff reached' : '6 PM safety notice'}>
          {w.phase === 'closed' ? guidance.message : w.message}
        </Banner>
      )}

      {guidance.afterClose && myActive.length > 0 && (
        <Banner tone="warn" title="Past 9 PM — finish safely">
          {guidance.message}
        </Banner>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        <Stat label="Today" value={completedToday.length} delta="deliveries completed" />
        <Stat label="Pending settlement" value={<Money value={rider.pendingEarnings} />} />
        <Stat label="Available" value={<Money value={rider.availableEarnings} />} tone="go" />
      </div>

      {/* active run */}
      {myActive.map((d) => (
        <Card key={d.id} className="stack-sm" onClick={() => navigate(`/rider/delivery/${d.id}`)} style={{ borderColor: 'var(--root-300)' }}>
          <div className="row-between">
            <span className="mono" style={{ fontWeight: 700 }}>{d.ref}</span>
            <span className="pill pill-motion">Active run</span>
          </div>
          <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
            {d.stops[0].label} → {d.stops[d.stops.length - 1].label} · {d.stops.length - 1} stop(s)
          </div>
          <div className="row-between">
            <span className="row faint" style={{ gap: 5, fontSize: 'var(--text-xs)' }}>
              <Bike size={13} /> {d.package.weightKg} kg · {d.package.sizeTier}
            </span>
            <strong>
              <Money value={Math.round(d.quote.total * (1 - state.config.pricing.commissionPct / 100))} />
            </strong>
          </div>
        </Card>
      ))}

      {/* offers */}
      <section className="stack">
        <h2 style={{ fontSize: 'var(--text-lg)' }}>Offers {myOffers.length > 0 && <span className="pill pill-wait" style={{ marginLeft: 6 }}>{myOffers.length} new</span>}</h2>
        {myOffers.length === 0 ? (
          <Card>
            <p className="muted" style={{ fontSize: 'var(--text-sm)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <Clock size={15} /> {rider.isAvailable ? 'No offers right now. Stay available — offers arrive based on proximity, capacity and reliability.' : 'You are offline. Turn availability on to receive offers.'}
            </p>
          </Card>
        ) : (
          myOffers.map((d) => {
            const secs = Math.max(0, Math.ceil(((d.offer?.expiresAt ?? now) - now) / 1000));
            const preview = eligibleRiders(d, [rider], state.config.policies);
            return (
              <Card key={d.id} className="stack-sm" style={{ borderColor: 'var(--dusk-300)' }}>
                <div className="row-between">
                  <span className="mono" style={{ fontWeight: 700 }}>{d.ref}</span>
                  <span className="mono" style={{ fontWeight: 700, color: 'var(--dusk-700)' }}>{secs}s to accept</span>
                </div>
                <div className="stack-sm" style={{ fontSize: 'var(--text-sm)' }}>
                  <div className="row" style={{ gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--root-600)', marginTop: 5 }} />
                    <span className="grow muted">{d.stops[0].label}</span>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--adire-600)', marginTop: 5 }} />
                    <span className="grow muted">{d.stops[d.stops.length - 1].label}</span>
                  </div>
                </div>
                <div className="row-between" style={{ fontSize: 'var(--text-xs)' }}>
                  <span className="faint">
                    {d.route.distanceKm.toFixed(1)} km · ~{d.route.etaMinutes} min · {d.package.weightKg} kg {d.package.fragile ? '· fragile' : ''}
                    {d.package.food ? '· sealed food' : ''}
                  </span>
                  <strong>
                    <Money value={Math.round(d.quote.total * (1 - state.config.pricing.commissionPct / 100))} /> est.
                  </strong>
                </div>
                {preview.eligible.length === 0 && (
                  <Banner tone="warn">This offer was filtered out for you (capacity or handling) — shown for transparency.</Banner>
                )}
                <div className="row" style={{ gap: 8 }}>
                  <Button
                    icon={Check}
                    onClick={() => {
                      dispatch({ type: 'delivery/accept', deliveryId: d.id, riderId: rider.id });
                      toast('Run accepted. Head to the pickup point.', 'success');
                      navigate(`/rider/delivery/${d.id}`);
                    }}
                  >
                    Accept
                  </Button>
                  <Button variant="secondary" icon={X} onClick={() => dispatch({ type: 'delivery/decline', deliveryId: d.id, riderId: rider.id })}>
                    Decline
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </section>

      {/* safety */}
      <Card className="stack-sm" style={{ borderColor: 'var(--alert-200)' }}>
        <div className="row-between">
          <div>
            <strong style={{ color: 'var(--alert-700)' }}>Emergency &amp; incident controls</strong>
            <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              SOS reports your situation to ops with the active delivery attached. Safety pauses carry no penalty. In immediate
              danger, call local emergency services (112) first.
            </p>
          </div>
          <AlertTriangle size={22} style={{ color: 'var(--alert-600)', flexShrink: 0 }} />
        </div>
        <Button variant="destructive" onClick={() => setSosOpen(true)}>
          SOS — report danger
        </Button>
      </Card>

      <Modal
        open={sosOpen}
        onClose={() => setSosOpen(false)}
        title="Report danger / unsafe situation"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSosOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                dispatch({
                  type: 'rider/sos',
                  riderId: rider.id,
                  deliveryId: myActive[0]?.id ?? null,
                  kind: 'sos',
                  note: sosNote || 'SOS triggered from rider dashboard',
                });
                setSosOpen(false);
                setSosNote('');
                toast('Incident recorded and ops notified. Your active run is paused with no penalty.', 'warn');
              }}
            >
              Send SOS report
            </Button>
          </>
        }
      >
        <Banner tone="danger" title="If you are in immediate danger">
          Call local emergency services (112 in Nigeria) first. This report notifies ROOT-X ops and creates a protected incident
          record — it does not guarantee an instant staffed response.
        </Banner>
        <TextArea value={sosNote} onChange={(e) => setSosNote(e.target.value)} placeholder="What is happening? Where are you?" />
      </Modal>
    </div>
  );
}
