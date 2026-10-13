import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Check, Flag, MapPin, Navigation, Package, Phone, Siren } from 'lucide-react';
import { Banner, Button, Card, Field, Modal, TextArea, TextInput, useToast } from '../../ds';
import { useRootX, useDispatchRootX, useNet, myRider, activeGuidanceNow } from '../../engine/store';
import { LiveMap } from '../../components/LiveMap';
import { Money, timeAgo } from '../../components/bits';
import { OSOGBO_CAMPUS, OKE_BAAALE } from '../../engine/zones';
import { attemptsLeft } from '../../engine/verification';

/* ============================================================================
   RiderActive — the full rider workflow for one delivery: approach, arrive,
   verify pickup code, collect, transit, arrive, verify delivery code. Status
   transitions are guarded by the engine; codes are attempt-limited. Offline
   status updates queue and sync on reconnect.
   ========================================================================== */

export default function RiderActive() {
  const { id } = useParams();
  const state = useRootX();
  const dispatch = useDispatchRootX();
  const toast = useToast();
  const rider = myRider(state)!;
  const d = state.deliveries.find((x) => x.id === id);
  const now = state.clock.epoch;
  const guidance = activeGuidanceNow(state);
  const net = useNet();

  const [code, setCode] = useState('');
  const [codeErr, setCodeErr] = useState<string | null>(null);
  const [sosOpen, setSosOpen] = useState(false);
  const [sosNote, setSosNote] = useState('');

  if (!d || d.riderId !== rider.id) {
    return (
      <div className="stack" style={{ maxWidth: 640, marginInline: 'auto' }}>
        <Card>Run not found. <Link to="/rider">Back to dashboard</Link></Card>
      </div>
    );
  }

  const isOffer = d.status === 'offered_to_riders';
  const stale = d.riderLocation ? now - d.riderLocation.updatedAt > 60_000 : false;
  const pickupLeft = attemptsLeft(d.verification, state.config.policies, 'pickup');
  const deliveryLeft = attemptsLeft(d.verification, state.config.policies, 'delivery');
  const pickupLocked = !!(d.verification.pickupLockedUntil && now < d.verification.pickupLockedUntil);
  const deliveryLocked = !!(d.verification.deliveryLockedUntil && now < d.verification.deliveryLockedUntil);
  const currentStopIdx = ['rider_assigned', 'rider_approaching_pickup', 'at_pickup', 'pickup_verification_pending'].includes(d.status) ? 0 : d.stops.length - 1;

  async function act(action: 'approach' | 'arrive_pickup' | 'request_pickup_code' | 'depart' | 'approach_dest' | 'arrive_dest') {
    const res = await dispatch({ type: 'delivery/riderAction', deliveryId: d!.id, action });
    if (!res) toast('Offline — the update is queued and will sync when you reconnect.', 'warn');
  }

  async function verifyCode(kind: 'pickup' | 'delivery') {
    const res = await dispatch({ type: 'delivery/verifyCode', deliveryId: d!.id, kind, code, by: 'rider' });
    if (!res) {
      toast('Offline — code checks need a connection and will not be queued. Try again when reconnected.', 'warn');
      return;
    }
    const nd = res.state?.deliveries.find((x) => x.id === d!.id);
    if (!nd) return;
    const advanced = kind === 'pickup' ? nd.status !== 'pickup_verification_pending' : !['delivery_verification_pending'].includes(nd.status);
    if (advanced) {
      setCode('');
      setCodeErr(null);
      toast(kind === 'pickup' ? 'Pickup verified. You can collect the package.' : 'Delivery verified. Run complete — earnings pending settlement.', 'success');
      return;
    }
    const lockedUntil = nd.verification[kind === 'pickup' ? 'pickupLockedUntil' : 'deliveryLockedUntil'];
    if (lockedUntil && nd.status === (kind === 'pickup' ? 'pickup_verification_pending' : 'delivery_verification_pending')) {
      setCodeErr('Temporarily locked after too many wrong attempts. Ask the sender/receiver to resend via support.');
      return;
    }
    const left = attemptsLeft(nd.verification, state.config.policies, kind);
    setCodeErr(`Wrong code. ${left} attempt(s) left before a temporary lock.`);
  }

  return (
    <div className="stack-lg" style={{ maxWidth: 640, marginInline: 'auto' }}>
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="data-label">{d.ref} · active run</div>
          <h1 style={{ fontSize: 'var(--text-lg)' }}>
            {currentStopIdx === 0 ? 'Get to pickup' : d.status === 'delivered' ? 'Completed' : 'Deliver the package'}
          </h1>
        </div>
        <strong>
          <Money value={Math.round(d.quote.total * (1 - state.config.pricing.commissionPct / 100))} />
        </strong>
      </div>

      {guidance.afterClose && !['delivered', 'cancelled'].includes(d.status) && (
        <Banner tone="warn" title="Past 9 PM">{guidance.message}</Banner>
      )}

      {!net.online && (
        <Banner tone="warn" title="Offline — updates queued">
          {net.queued} update(s) will sync automatically when you reconnect. Code verification always confirms with the
          server first and is never queued.
        </Banner>
      )}

      {/* stops */}
      <Card className="stack-sm">
        <div className="data-label">Route ({d.stops.length} stops)</div>
        {d.stops.map((s, i) => {
          const isCurrent = i === currentStopIdx && !['delivered', 'cancelled'].includes(d.status);
          return (
            <div key={s.id} className="row" style={{ gap: 10, opacity: isCurrent || d.status === 'delivered' ? 1 : 0.6 }}>
              <span
                className="mono"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                  background: isCurrent ? 'var(--root-600)' : 'var(--canvas-tint)',
                  color: isCurrent ? 'white' : 'var(--ink-3)',
                }}
              >
                {i + 1}
              </span>
              <div className="grow">
                <strong style={{ fontSize: 'var(--text-sm)' }}>{s.label}</strong>
                <span className="faint" style={{ display: 'block', fontSize: 'var(--text-xs)' }}>
                  {s.kind === 'pickup' ? 'Pickup — sender will show a code' : `Receiver: ${s.receiver?.name} · ${s.receiver?.phone}`}
                </span>
              </div>
              {isCurrent && <span className="pill pill-motion">Current</span>}
            </div>
          );
        })}
        <p className="faint" style={{ fontSize: 'var(--text-xs)' }}>
          Route sequencing is pre-validated before the order is confirmed. Contact numbers are masked in production.
        </p>
      </Card>

      <LiveMap
        zones={[OSOGBO_CAMPUS, OKE_BAAALE]}
        height={260}
        route={d.route.points}
        pins={[
          ...d.stops.map((s, i) => ({ x: s.x, y: s.y, kind: (s.kind === 'pickup' ? 'pickup' : 'dropoff') as 'pickup' | 'dropoff', index: i + 1 })),
          ...(d.riderLocation ? [{ x: d.riderLocation.x, y: d.riderLocation.y, kind: 'rider' as const, label: 'You', stale, active: d.status === 'in_transit' }] : []),
        ]}
        caption="Navigation uses campus-aware routes in production (gates, walking paths, restricted areas)."
      />

      {d.riderLocation && (
        <div className="row-between" style={{ fontSize: 'var(--text-xs)' }}>
          <span className="faint">Your location shared only during this run · updated {timeAgo(d.riderLocation.updatedAt, now)}</span>
          {stale && <span style={{ color: 'var(--dusk-700)', fontWeight: 700 }}>GPS stale</span>}
        </div>
      )}

      {/* package info */}
      <Card className="stack-sm">
        <div className="data-label">Package</div>
        <div className="row" style={{ gap: 8 }}>
          {d.package.photos.map((p, i) => (
            <img key={i} src={p} alt={`Package photo ${i + 1}`} style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--line)' }} />
          ))}
        </div>
        <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          {d.package.description} · {d.package.weightKg} kg · {d.package.sizeTier}
          {d.package.fragile && <span className="pill pill-wait" style={{ marginLeft: 6 }}>Fragile</span>}
          {d.package.food && <span className="pill pill-hold" style={{ marginLeft: 6 }}>Sealed food</span>}
        </div>
        {d.package.handlingNotes && <div className="faint" style={{ fontSize: 'var(--text-xs)' }}>{d.package.handlingNotes}</div>}
        <Banner tone="info">
          You may refuse a package at pickup if contents differ from the description or appear prohibited — refusal is protected.
        </Banner>
      </Card>

      {/* workflow actions by state */}
      {isOffer && (
        <Card className="row-between">
          <span>This run is still offered to riders.</span>
          <Button onClick={() => dispatch({ type: 'delivery/accept', deliveryId: d.id, riderId: rider.id })}>Accept offer</Button>
        </Card>
      )}

      {d.status === 'rider_assigned' && (
        <Button block size="lg" icon={Navigation} onClick={() => act('approach')}>
          Start navigation to pickup
        </Button>
      )}
      {d.status === 'rider_approaching_pickup' && (
        <Button block size="lg" icon={MapPin} onClick={() => act('arrive_pickup')}>
          I've arrived at pickup
        </Button>
      )}
      {d.status === 'at_pickup' && (
        <Button block size="lg" icon={Package} onClick={() => act('request_pickup_code')}>
          Ask sender for pickup code
        </Button>
      )}
      {d.status === 'pickup_verification_pending' && (
        <Card className="stack">
          <div className="data-label">Enter the pickup code from the sender</div>
          <Banner tone="info" icon={Check}>
            The sender reads this code from their ROOT-X app — ask them for it at handover. Codes are attempt-limited; a
            wrong series locks verification temporarily.
          </Banner>
          <div className="row">
            <TextInput
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="4-digit code"
              inputMode="numeric"
              aria-label="Pickup code"
              invalid={!!codeErr}
              style={{ maxWidth: 160, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', letterSpacing: '0.2em' }}
            />
            <Button size="lg" disabled={code.length !== 4 || pickupLocked} onClick={() => verifyCode('pickup')}>
              Verify
            </Button>
          </div>
          {codeErr && <Banner tone="danger">{codeErr}</Banner>}
        </Card>
      )}
      {d.status === 'package_collected' && (
        <Button block size="lg" icon={ArrowRight} onClick={() => act('depart')}>
          Head to destination
        </Button>
      )}
      {(d.status === 'in_transit' || d.status === 'approaching_destination') && (
        <Card className="stack-sm">
          <div className="row-between">
            <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>In transit · {Math.round(d.riderProgress * 100)}% of route</span>
            <Button variant="secondary" size="sm" icon={MapPin} onClick={() => (d.status === 'in_transit' ? act('approach_dest') : act('arrive_dest'))}>
              {d.status === 'in_transit' ? "I'm approaching" : "I've arrived"}
            </Button>
          </div>
          <div style={{ height: 8, borderRadius: 99, background: 'var(--canvas-tint)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${d.riderProgress * 100}%`, background: 'var(--root-500)', borderRadius: 99, transition: 'width 1s linear' }} />
          </div>
        </Card>
      )}
      {d.status === 'delivery_verification_pending' && (
        <Card className="stack">
          <div className="data-label">Enter the delivery code from the receiver</div>
          <Banner tone="info" icon={Check}>
            The receiver reads this code from their private tracking link — ask them at handover. Codes are attempt-limited.
          </Banner>
          <div className="row">
            <TextInput
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="4-digit code"
              inputMode="numeric"
              aria-label="Delivery code"
              invalid={!!codeErr}
              style={{ maxWidth: 160, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', letterSpacing: '0.2em' }}
            />
            <Button size="lg" disabled={code.length !== 4 || deliveryLocked} onClick={() => verifyCode('delivery')}>
              Verify &amp; complete
            </Button>
          </div>
          {codeErr && <Banner tone="danger">{codeErr}</Banner>}
          <Banner tone="warn">
            Receiver unavailable? Wait {state.config.policies.failedDeliveryWaitMin} minutes (configurable), try contacting them, then use
            "Return to sender" — never abandon a package.
          </Banner>
          <Button variant="secondary" icon={Flag} onClick={() => dispatch({ type: 'delivery/returnToSender', deliveryId: d.id })}>
            Receiver unavailable — return to sender
          </Button>
        </Card>
      )}
      {d.status === 'delivered' && (
        <Banner tone="success" title="Run complete">
          Earnings are pending settlement. Thank you! <Link to="/rider/earnings">View earnings</Link>
        </Banner>
      )}
      {d.status === 'return_required' && (
        <Banner tone="warn" title="Return to sender">
          Contact the sender and support to arrange the return or a rescheduled redelivery. Return fees follow the published policy.
        </Banner>
      )}
      {d.status === 'cancelled' && (
        <Banner tone="info" title="Run cancelled">
          This run was cancelled. Check notifications for details — safety-related cancellations carry no penalty.
        </Banner>
      )}

      {/* safety */}
      {!['delivered', 'cancelled'].includes(d.status) && (
        <div className="row wrap" style={{ gap: 8 }}>
          <Button variant="secondary" icon={Phone} onClick={() => toast('Masked calling in production — numbers stay private.', 'info')}>
            Contact sender
          </Button>
          <Button variant="destructive" icon={Siren} onClick={() => setSosOpen(true)}>
            SOS
          </Button>
        </div>
      )}

      <Modal
        open={sosOpen}
        onClose={() => setSosOpen(false)}
        title="SOS — emergency assistance"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSosOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                dispatch({ type: 'rider/sos', riderId: rider.id, deliveryId: d.id, kind: 'sos', note: sosNote || 'SOS during active delivery' });
                setSosOpen(false);
                toast('Incident recorded, ops notified, run paused — no penalty. If in immediate danger call 112 first.', 'warn');
              }}
            >
              Send SOS
            </Button>
          </>
        }
      >
        <Banner tone="danger">Call 112 first if you are in immediate danger. This records a protected incident and pauses the run without penalty.</Banner>
        <Field label="What's happening?">
          <TextArea value={sosNote} onChange={(e) => setSosNote(e.target.value)} placeholder="Location, situation, people involved" />
        </Field>
      </Modal>
    </div>
  );
}
