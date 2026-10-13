import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Flag, ShieldCheck } from 'lucide-react';
import { Banner, Button, Card, Field, Modal, TextArea, useToast } from '../../ds';
import { useRootX, useDispatchRootX, deliveryByToken, activeGuidanceNow } from '../../engine/store';
import { Logo } from '../auth/Login';
import { TrackingTimeline } from '../../components/Timeline';
import { SchematicMap } from '../../components/SchematicMap';
import { DeliveryStatusPill, fmtDay, fmtTime, timeAgo } from '../../components/bits';
import { OSOGBO_CAMPUS, OKE_BAAALE } from '../../engine/zones';
import { attemptsLeft } from '../../engine/verification';

/* ============================================================================
   GuestTrack — the private, token-protected receiver view.
   Minimum necessary information: progress, ETA, rider first name + transport,
   and the delivery verification code. No account required. Tokens are
   unguessable, expiring and revocable; expired/revoked links stop working.
   ========================================================================== */

const ZONE_MAP = { 'osogbo-campus': OSOGBO_CAMPUS, 'oke-baale': OKE_BAAALE };

export default function GuestTrack() {
  const { token } = useParams();
  const state = useRootX();
  const dispatch = useDispatchRootX();
  const toast = useToast();
  const now = state.clock.epoch;

  const d = token ? deliveryByToken(state, token) : null;
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDesc, setReportDesc] = useState('');

  if (!d) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Card className="stack" style={{ maxWidth: 420, textAlign: 'center', alignItems: 'center' }}>
          <Logo size={26} />
          <h1 style={{ fontSize: 'var(--text-lg)' }}>This tracking link isn't available</h1>
          <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
            The link may have expired, been revoked by the sender, or mistyped. Ask the sender to share a fresh link from their
            delivery screen.
          </p>
          <Link to="/login" className="btn btn-secondary btn-md">
            Go to ROOT-X
          </Link>
        </Card>
      </div>
    );
  }

  const sender = state.users.find((u) => u.id === d.customerId);
  const rider = state.riders.find((r) => r.id === d.riderId);
  const guidance = activeGuidanceNow(state);
  const stale = d.riderLocation ? now - d.riderLocation.updatedAt > 60_000 : false;
  const remaining = d.status === 'in_transit' || d.status === 'approaching_destination' ? Math.max(1, Math.round(d.route.etaMinutes * (1 - d.riderProgress))) : null;
  const left = attemptsLeft(d.verification, state.config.policies, 'delivery');

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--canvas)', paddingBottom: 48 }}>
      <header style={{ padding: '14px 16px', borderBottom: '1px solid var(--line-subtle)', background: 'oklch(0.978 0.005 80 / 0.9)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 40 }}>
        <div className="row-between" style={{ maxWidth: 640, marginInline: 'auto' }}>
          <Logo size={24} />
          <span className="pill pill-hold">Receiver view</span>
        </div>
      </header>

      <main className="stack-lg" style={{ maxWidth: 640, marginInline: 'auto', padding: '16px' }}>
        <div>
          <div className="data-label">
            {d.ref} · from {sender?.name ?? 'a ROOT-X member'}
          </div>
          <h1 style={{ fontSize: 'var(--text-xl)' }}>
            {['delivered'].includes(d.status) ? 'Delivered ✔' : ['cancelled'].includes(d.status) ? 'Delivery cancelled' : 'Your delivery is on its way'}
          </h1>
          <div className="row" style={{ gap: 8, marginTop: 6 }}>
            <DeliveryStatusPill status={d.status} />
            {remaining && (
              <span className="mono" style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                ~{remaining} min
              </span>
            )}
          </div>
        </div>

        {guidance.afterClose && !['delivered', 'cancelled'].includes(d.status) && (
          <Banner tone="warn" title="Past 9 PM">
            {guidance.message}
          </Banner>
        )}

        {stale && d.riderLocation && (
          <Banner tone="warn" title="Rider location may be stale">
            Last update {timeAgo(d.riderLocation.updatedAt, now)} — poor network happens on campus. We show the timestamp rather
            than pretend it's live.
          </Banner>
        )}

        {['in_transit', 'approaching_destination', 'rider_assigned', 'rider_approaching_pickup', 'at_pickup', 'package_collected'].includes(d.status) && (
          <SchematicMap
            zones={[ZONE_MAP['osogbo-campus'], ZONE_MAP['oke-baale']]}
            height={240}
            route={d.route.points}
            pins={[
              { x: d.stops[0].x, y: d.stops[0].y, kind: 'pickup' as const, index: 1 },
              { x: d.stops[d.stops.length - 1].x, y: d.stops[d.stops.length - 1].y, kind: 'dropoff' as const, index: 2 },
              ...(d.riderLocation ? [{ x: d.riderLocation.x, y: d.riderLocation.y, kind: 'rider' as const, label: riderName(state, d.riderId), stale, active: true }] : []),
            ]}
            caption="Route and rider position (schematic demo map)."
          />
        )}

        {rider && (
          <Card className="row-between">
            <div>
              <strong>{riderName(state, d.riderId)}</strong>
              <div className="faint" style={{ fontSize: 'var(--text-xs)' }}>
                {rider.transport} · {rider.rating.toFixed(1)}★ · verified student
              </div>
            </div>
            <span className="row" style={{ gap: 5, fontSize: 'var(--text-xs)', color: 'var(--root-700)', fontWeight: 700 }}>
              <ShieldCheck size={14} /> Verified rider
            </span>
          </Card>
        )}

        <Card>
          <TrackingTimeline d={d} now={now} />
        </Card>

        {/* delivery code — the receiver's handover verification */}
        {d.status === 'delivery_verification_pending' && (
          <Card className="stack">
            <div className="data-label">Give this code to the rider when you receive the package</div>
            <div className="mono" style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, letterSpacing: '0.18em', textAlign: 'center', padding: '8px 0' }}>
              {d.deliveryCode}
            </div>
            <Banner tone="info">
              The rider enters this code to confirm the handover. {left} attempt{left === 1 ? '' : 's'} left before a temporary lock
              (protects against guessing). Reuse is prevented.
            </Banner>
          </Card>
        )}

        {d.status === 'pickup_verification_pending' && (
          <Card className="stack-sm">
            <div className="data-label">Almost there</div>
            <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              The rider is at pickup confirming the sender's pickup code. Your delivery code appears here when they arrive.
            </p>
          </Card>
        )}

        <Card className="stack-sm">
          <div className="data-label">Delivery details</div>
          <div className="kv">
            <span className="kv-key">Contents</span>
            <span className="kv-val">{d.package.description}</span>
          </div>
          <div className="kv">
            <span className="kv-key">From</span>
            <span className="kv-val">{d.stops[0].label}</span>
          </div>
          <div className="kv">
            <span className="kv-key">To</span>
            <span className="kv-val">{d.stops[d.stops.length - 1].label}</span>
          </div>
          <div className="kv">
            <span className="kv-key">Ordered</span>
            <span className="kv-val">
              {fmtDay(d.createdAt, now)} {fmtTime(d.createdAt)}
            </span>
          </div>
        </Card>

        <div className="row">
          <Button variant="secondary" icon={Flag} onClick={() => setReportOpen(true)}>
            Report a problem
          </Button>
        </div>

        <p className="faint" style={{ fontSize: 'var(--text-xs)', textAlign: 'center' }}>
          This private link expires {fmtDay(d.trackingToken.expiresAt, now)} {fmtTime(d.trackingToken.expiresAt)} and can be revoked by
          the sender. It shows only this delivery — nothing else about the sender or rider.
        </p>
      </main>

      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Report a problem"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReportOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                dispatch({ type: 'delivery/reportProblem', deliveryId: d.id, reason: 'Receiver reported a problem', description: reportDesc, by: 'receiver:token' });
                setReportOpen(false);
                toast('Thanks — the case is with our ops team for a fair review.', 'success');
              }}
            >
              Send report
            </Button>
          </>
        }
      >
        <Field label="What went wrong?" required>
          <TextArea value={reportDesc} onChange={(e) => setReportDesc(e.target.value)} placeholder="Describe the issue — this creates a case record with the delivery's verification history attached." />
        </Field>
      </Modal>
    </div>
  );
}

function riderName(state: { riders: { id: string; userId: string }[]; users: { id: string; name: string }[] }, riderId: string | null): string {
  const r = state.riders.find((x) => x.id === riderId);
  if (!r) return 'Rider';
  const names: Record<string, string> = { 'r-kofi': 'Kofi M.', 'r-ibrahim': 'Ibrahim S.', 'r-blessing': 'Blessing A.' };
  return r.userId ? state.users.find((u) => u.id === r.userId)?.name ?? 'Rider' : names[r.id] ?? 'Rider';
}
