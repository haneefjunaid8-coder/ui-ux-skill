import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Copy, Flag, MessageSquare, Phone, QrCode, Star, XCircle } from 'lucide-react';
import { Banner, Button, Card, Field, Modal, TextArea, TextInput, useToast } from '../../ds';
import { useRootX, useDispatchRootX, currentUser, activeGuidanceNow, activeZones } from '../../engine/store';
import { SchematicMap } from '../../components/SchematicMap';
import { TrackingTimeline, StatusHistoryList } from '../../components/Timeline';
import { DeliveryStatusPill, Money, fmtDay, fmtTime, timeAgo } from '../../components/bits';
import { cancellationStage } from '../../engine/stateMachine';
import { fmtNaira } from '../../engine/ledger';

export default function DeliveryDetail() {
  const { id } = useParams();
  const state = useRootX();
  const dispatch = useDispatchRootX();
  const toast = useToast();
  const user = currentUser(state)!;
  const d = state.deliveries.find((x) => x.id === id);
  const now = state.clock.epoch;

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Package arrived damaged');
  const [reportDesc, setReportDesc] = useState('');
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');

  if (!d) return <div className="page"><Card>Delivery not found. <Link to="/deliveries">Back</Link></Card></div>;

  const rider = state.riders.find((r) => r.id === d.riderId);
  const zones = activeZones(state).filter((z) => z.id === 'osogbo-campus' || z.id === 'oke-baale');
  const stale = d.riderLocation ? now - d.riderLocation.updatedAt > 60_000 : false;
  const guidance = activeGuidanceNow(state);
  const onRoad = !['delivered', 'cancelled', 'awaiting_payment', 'awaiting_rider', 'offered_to_riders', 'draft'].includes(d.status);
  const stage = state.config.hours.cancellationFeeStages[cancellationStage(d.status)];
  const receiverLink = `${window.location.origin}/track/${d.trackingToken.token}`;

  return (
    <div className="stack-lg" style={{ maxWidth: 640, marginInline: 'auto' }}>
      {/* header */}
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="data-label">{d.ref} · {fmtDay(d.createdAt, now)}</div>
          <h1 style={{ fontSize: 'var(--text-xl)' }}>{d.stops[0].label} → {d.stops[d.stops.length - 1].label}</h1>
          <div className="row" style={{ gap: 8, marginTop: 6 }}>
            <DeliveryStatusPill status={d.status} />
            {d.package.fragile && <span className="pill pill-hold">Fragile</span>}
            {d.package.food && <span className="pill pill-hold">Sealed food</span>}
            {(d.package.declaredValue ?? 0) >= state.config.pricing.highValueThreshold && <span className="pill pill-wait">High value</span>}
          </div>
        </div>
      </div>

      {/* live map */}
      {(onRoad || d.status === 'offered_to_riders' || d.status === 'rider_assigned') && (
        <div className="stack-sm">
          <SchematicMap
            zones={zones}
            height={280}
            route={d.route.points}
            pins={[
              { x: d.stops[0].x, y: d.stops[0].y, kind: 'pickup', index: 1 },
              ...d.stops.slice(1).map((s, i) => ({ x: s.x, y: s.y, kind: 'dropoff' as const, index: i + 2 })),
              ...(d.riderLocation
                ? [{ x: d.riderLocation.x, y: d.riderLocation.y, kind: 'rider' as const, label: riderName(state, d.riderId), stale, active: d.status === 'in_transit' || d.status === 'approaching_destination' }]
                : []),
            ]}
            caption="Rider location updates adapt to movement and network. Grey 'GPS STALE' means the fix is old — never treated as live."
          />
          {d.riderLocation && (
            <div className="row-between" style={{ fontSize: 'var(--text-xs)' }}>
              <span className={stale ? '' : 'faint'} style={{ color: stale ? 'var(--dusk-700)' : undefined, fontWeight: stale ? 700 : 400 }}>
                {stale ? '⚠ Location may be stale — last update ' : 'Rider location · updated '}
                {timeAgo(d.riderLocation.updatedAt, now)}
              </span>
              {(d.status === 'in_transit' || d.status === 'approaching_destination') && (
                <span className="mono" style={{ fontWeight: 700 }}>
                  ~{Math.max(1, Math.round(d.route.etaMinutes * (1 - d.riderProgress)))} min left
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {guidance.afterClose && onRoad && (
        <Banner tone="warn" title="Past 9 PM — safe resolution">
          {guidance.message}
        </Banner>
      )}

      {/* rider card */}
      {rider && (
        <Card className="row-between">
          <div className="row" style={{ gap: 12 }}>
            <span className="avatar">{'B'}</span>
            <div>
              <strong>{riderName(state, d.riderId)}</strong>
              <div className="faint" style={{ fontSize: 'var(--text-xs)' }}>
                {rider.transport} · {rider.rating.toFixed(1)}★ · {rider.completed} deliveries
              </div>
            </div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <Button variant="secondary" size="sm" icon={Phone} onClick={() => toast('In-app calling uses masked numbers in production — your real number stays private.', 'info')}>
              Call
            </Button>
            <Button variant="secondary" size="sm" icon={MessageSquare} onClick={() => toast('Chat is available for this delivery in production. Messages are retained for dispute resolution per policy.', 'info')}>
              Chat
            </Button>
          </div>
        </Card>
      )}

      {/* verification codes */}
      {(onRoad || d.status === 'delivered') && (
        <Card className="stack-sm">
          <div className="data-label">Verification codes</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <CodeBox label="Pickup code — show to rider" code={d.pickupCode} verified={!!d.verification.pickupVerifiedAt} onCopy={() => toast('Pickup code copied', 'success')} />
            <CodeBox label="Delivery code — receiver only" code={d.verification.deliveryVerifiedAt ? '✔ used' : 'sent to receiver'} verified={!!d.verification.deliveryVerifiedAt} masked />
          </div>
          <p className="faint" style={{ fontSize: 'var(--text-xs)' }}>
            Codes are single-use, attempt-limited and logged. A package cannot be marked collected or delivered without them.
          </p>
        </Card>
      )}

      {/* receiver link */}
      {!['delivered', 'cancelled'].includes(d.status) && (
        <Card className="stack-sm">
          <div className="data-label">Private receiver tracking link</div>
          <div className="row">
            <TextInput readOnly value={receiverLink} aria-label="Receiver tracking link" style={{ fontSize: 'var(--text-xs)' }} />
            <Button variant="secondary" size="sm" icon={Copy} onClick={() => { navigator.clipboard?.writeText(receiverLink); toast('Link copied — share with your receiver', 'success'); }}>
              Copy
            </Button>
            <Button variant="secondary" size="sm" onClick={() => { dispatch({ type: 'tracking/rotate', deliveryId: d.id }); toast('New link issued — the old one is now invalid', 'success'); }}>
              New link
            </Button>
            <Button variant="quiet-danger" size="sm" icon={XCircle} onClick={() => { dispatch({ type: 'tracking/revoke', deliveryId: d.id }); toast('Link revoked — it can no longer open tracking', 'warn'); }}>
              Revoke
            </Button>
          </div>
          <p className="faint" style={{ fontSize: 'var(--text-xs)' }}>
            Time-limited ({state.config.policies.guestTokenHours} h), revocable, and shows only this delivery's progress and the delivery code. Try it in a guest tab.
            {d.trackingToken.revoked && <span className="pill pill-hold" style={{ marginLeft: 8 }}>Revoked</span>}
          </p>
        </Card>
      )}

      {/* timeline */}
      <Card>
        <TrackingTimeline d={d} now={now} />
      </Card>

      {/* package + price */}
      <Card className="stack-sm">
        <div className="data-label">Package &amp; payment</div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {d.package.photos.map((p, i) => (
            <img key={i} src={p} alt={`Package photo ${i + 1}`} style={{ width: 84, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--line)' }} />
          ))}
        </div>
        <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>{d.package.description} · {d.package.weightKg} kg · {d.package.sizeTier}</div>
        {d.quote.lines.map((l) => (
          <div key={l.key} className="row-between" style={{ fontSize: 'var(--text-sm)' }}>
            <span className="faint">{l.label}</span>
            <Money value={l.amount} />
          </div>
        ))}
        <div className="row-between" style={{ fontWeight: 700 }}>
          <span>{d.payment ? 'Paid' : 'Total'}</span>
          <Money value={d.payment?.amount ?? d.quote.total} />
        </div>
        {d.ledger && (
          <div className="faint mono" style={{ fontSize: 'var(--text-2xs)' }}>
            ledger: charge {fmtNaira(d.ledger.charge)} · fee {fmtNaira(d.ledger.gatewayFee)} · commission {fmtNaira(d.ledger.commission)} ({state.config.pricing.commissionPct}%) · rider {fmtNaira(d.ledger.riderNet)} · settlement {d.ledger.settlement}
          </div>
        )}
      </Card>

      {/* actions */}
      {!['delivered', 'cancelled'].includes(d.status) && (
        <div className="row wrap" style={{ gap: 8 }}>
          <Button variant="secondary" icon={Flag} onClick={() => setReportOpen(true)}>Report a problem</Button>
          <Button variant="quiet-danger" icon={XCircle} onClick={() => setCancelOpen(true)}>Cancel delivery</Button>
        </div>
      )}

      {/* rating */}
      {d.status === 'delivered' && !d.rating && (
        <Card className="stack-sm">
          <div className="data-label">Rate your rider</div>
          <div className="row" style={{ gap: 4 }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} onClick={() => setRating(s)} aria-label={`${s} star${s > 1 ? 's' : ''}`} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}>
                <Star size={28} color={s <= rating ? 'var(--dusk-500)' : 'var(--earth-300)'} fill={s <= rating ? 'var(--dusk-500)' : 'transparent'} />
              </button>
            ))}
          </div>
          <TextInput value={ratingComment} onChange={(e) => setRatingComment(e.target.value)} placeholder="Optional comment (kept respectful — riders can respond and appeal)" />
          <Button
            disabled={!rating}
            onClick={() => {
              dispatch({ type: 'delivery/rate', deliveryId: d.id, stars: rating, tags: [], comment: ratingComment });
              toast('Thanks! Ratings feed rider performance contextually — one late night never defines a rider.', 'success');
            }}
          >
            Submit rating
          </Button>
        </Card>
      )}
      {d.rating && (
        <Card className="row-between">
          <span className="row" style={{ gap: 6 }}>
            <Star size={16} color="var(--dusk-500)" fill="var(--dusk-500)" /> You rated {d.rating.stars}.0
          </span>
          <span className="faint" style={{ fontSize: 'var(--text-xs)' }}>{fmtTime(d.rating.at)}</span>
        </Card>
      )}

      {/* audit trail */}
      <Card>
        <div className="data-label" style={{ marginBottom: 8 }}>Full status history (audit)</div>
        <StatusHistoryList d={d} now={now} />
      </Card>

      {/* cancel modal */}
      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={`Cancel ${d.ref}?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>Keep delivery</Button>
            <Button
              variant="destructive"
              onClick={() => {
                dispatch({ type: 'delivery/cancel', deliveryId: d.id, reason: cancelReason || 'Customer cancelled', by: user.id, actorName: user.name });
                setCancelOpen(false);
                toast('Delivery cancelled. Any refund went to your wallet.', 'success');
              }}
            >
              Cancel delivery
            </Button>
          </>
        }
      >
        <Banner tone="warn" title={`Stage: ${stage.label}`}>
          Cancellation fee: <strong>{fmtNaira(stage.fee)}</strong>
          {stage.fee > 0 ? ` — refunded to wallet: ${fmtNaira(Math.max(0, (d.payment?.amount ?? 0) - stage.fee))}` : ' — full refund.'} Safety and emergency reasons are exempt from fees.
        </Banner>
        <Field label="Reason (helps us protect riders and improve matching)" required>
          <TextArea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="e.g. Receiver no longer available / safety concern / changed my mind" />
        </Field>
      </Modal>

      {/* report modal */}
      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Report a problem"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReportOpen(false)}>Close</Button>
            <Button
              onClick={() => {
                dispatch({ type: 'delivery/reportProblem', deliveryId: d.id, reason: reportReason, description: reportDesc, by: user.id });
                setReportOpen(false);
                toast('Case opened. Ops reviews verification records, photos and route history before deciding.', 'success');
              }}
            >
              Open case
            </Button>
          </>
        }
      >
        <Field label="What happened?" required>
          <select className="select" value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
            <option>Package arrived damaged</option>
            <option>Package not delivered / wrong location</option>
            <option>Rider behaviour concern</option>
            <option>Item missing from package</option>
            <option>Overcharged / billing issue</option>
            <option>Safety concern</option>
          </select>
        </Field>
        <Field label="Describe the issue" required hint="Photos, codes and route history are attached automatically to the case record.">
          <TextArea value={reportDesc} onChange={(e) => setReportDesc(e.target.value)} placeholder="What happened, when, and what would make it right?" />
        </Field>
        <Banner tone="info">
          Cases get a fair human review. Filing a report never automatically penalises a rider or customer.
        </Banner>
      </Modal>
    </div>
  );
}

function CodeBox({ label, code, verified, masked, onCopy }: { label: string; code: string; verified: boolean; masked?: boolean; onCopy?: () => void }) {
  return (
    <div className="card card-tint stack-sm" style={{ padding: 12 }}>
      <div className="data-label">{label}</div>
      <div className="row-between">
        <span className="mono" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, letterSpacing: '0.12em' }}>
          {masked ? <span style={{ fontSize: 'var(--text-sm)', letterSpacing: 0 }}>{code}</span> : code}
        </span>
        {!masked && onCopy && <Button variant="ghost" size="sm" icon={Copy} onClick={onCopy} aria-label="Copy pickup code" />}
      </div>
      {verified && <span className="pill pill-go">Verified</span>}
    </div>
  );
}

export function riderName(state: { riders: { id: string; userId: string }[]; users: { id: string; name: string }[] }, riderId: string | null): string {
  if (!riderId) return 'Rider';
  const r = state.riders.find((x) => x.id === riderId);
  if (!r) return 'Rider';
  const names: Record<string, string> = { 'r-kofi': 'Kofi M.', 'r-ibrahim': 'Ibrahim S.', 'r-blessing': 'Blessing A.' };
  return r.userId ? state.users.find((u) => u.id === r.userId)?.name ?? 'Rider' : names[r.id] ?? 'Rider';
}
