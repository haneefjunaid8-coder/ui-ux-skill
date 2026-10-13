import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Flag, ShieldCheck } from 'lucide-react';
import { Banner, Button, Card, Field, Modal, TextArea, useToast } from '../../ds';
import { Logo } from '../auth/Login';
import { LiveMap } from '../../components/LiveMap';
import { DeliveryStatusPill, fmtDay, fmtTime, timeAgo } from '../../components/bits';
import { OSOGBO_CAMPUS, OKE_BAAALE } from '../../engine/zones';
import type { DeliveryStatus } from '../../engine/types';

/* ============================================================================
   GuestTrack — the private, token-protected receiver view.
   ----------------------------------------------------------------------------
   No account, no app state: this page reads only /api/guest/:token — a
   server-redacted, delivery-scoped view (status, map position, ETA, rider
   first name + transport, and the delivery code). Tokens are unguessable,
   expiring and revocable; expired/revoked links stop working server-side.
   Polls every 5 s — good enough for a receiver, and honest about freshness.
   ========================================================================== */

const ZONE_MAP = { 'osogbo-campus': OSOGBO_CAMPUS, 'oke-baale': OKE_BAAALE };

interface GuestView {
  ref: string;
  status: DeliveryStatus;
  statusHistory: { status: DeliveryStatus; at: number }[];
  stops: { kind: 'pickup' | 'dropoff'; label: string; x: number; y: number; zoneId: string }[];
  route: { points: { x: number; y: number }[]; distanceKm: number; etaMinutes: number };
  riderLocation: { x: number; y: number; updatedAt: number; stale: boolean } | null;
  riderProgress: number;
  riderFirstName: string;
  riderVehicle: string | null;
  deliveryCode: string;
  package: { category: string; fragile: boolean; food: boolean };
  expiresAt: number;
  epoch: number;
}

export default function GuestTrack() {
  const { token } = useParams();
  const toast = useToast();
  const [view, setView] = useState<GuestView | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'gone'>('loading');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDesc, setReportDesc] = useState('');

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`/api/guest/${encodeURIComponent(token)}`, { credentials: 'include' });
      if (r.status === 404) {
        setState('gone');
        return;
      }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      setView((await r.json()) as GuestView);
      setState('ok');
    } catch {
      /* keep the last good view; the next poll retries */
    }
  }, [token]);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 5000);
    return () => clearInterval(t);
  }, [refresh]);

  if (state === 'loading') {
    return (
      <div className="boot-splash" role="status" aria-label="Opening tracking link">
        <div className="boot-orb" aria-hidden />
        <p>Opening your tracking link…</p>
      </div>
    );
  }

  if (state === 'gone' || !view) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Card className="stack" style={{ maxWidth: 420, textAlign: 'center', alignItems: 'center' }}>
          <Logo size={26} />
          <h1 style={{ fontSize: 'var(--text-lg)' }}>This tracking link isn&rsquo;t available</h1>
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

  const now = view.epoch;
  const stale = view.riderLocation ? now - view.riderLocation.updatedAt > 60_000 : false;
  const remaining =
    view.status === 'in_transit' || view.status === 'approaching_destination'
      ? Math.max(1, Math.round(view.route.etaMinutes * (1 - view.riderProgress)))
      : null;
  const zones = [...new Set(view.stops.map((s) => s.zoneId))]
    .map((z) => ZONE_MAP[z as keyof typeof ZONE_MAP])
    .filter(Boolean);

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--canvas)', paddingBottom: 48 }}>
      <header style={{ padding: '14px 16px', borderBottom: '1px solid var(--line-subtle)', background: 'oklch(0.185 0.028 258 / 0.9)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 40 }}>
        <div className="row-between" style={{ maxWidth: 680, marginInline: 'auto' }}>
          <Logo size={22} />
          <span className="muted" style={{ fontSize: 'var(--text-2xs)' }}>
            Private link · expires {fmtDay(view.expiresAt, now)} {fmtTime(view.expiresAt)}
          </span>
        </div>
      </header>

      <main className="stack-lg" style={{ maxWidth: 680, marginInline: 'auto', padding: '20px 16px 0' }}>
        <div>
          <div className="data-label">{view.ref} · guest tracking</div>
          <h1 style={{ fontSize: 'var(--text-xl)', marginTop: 2 }}>
            {view.stops[0]?.label} → {view.stops[view.stops.length - 1]?.label}
          </h1>
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <DeliveryStatusPill status={view.status} />
            {view.package.fragile && <span className="pill pill-wait">Fragile</span>}
            {remaining != null && <span className="pill pill-motion">Arriving in ~{remaining} min</span>}
          </div>
        </div>

        <LiveMap
          zones={zones}
          height={280}
          pins={[
            ...view.stops.map((s, i) => ({ x: s.x, y: s.y, kind: (s.kind === 'pickup' ? 'pickup' : 'dropoff') as 'pickup' | 'dropoff', label: s.label, index: i + 1 })),
            ...(view.riderLocation ? [{ x: view.riderLocation.x, y: view.riderLocation.y, kind: 'rider' as const, label: stale ? `Last seen ${timeAgo(view.riderLocation.updatedAt, now)}` : `${view.riderFirstName} · live`, stale }] : []),
          ]}
          route={view.route.points}
          caption={
            stale
              ? `Rider location last seen ${timeAgo(view.riderLocation?.updatedAt ?? now, now)} — shown as stale, never as live.`
              : view.riderLocation
                ? 'Rider location is live during the active run only.'
                : 'Rider location appears once the run is on its way.'
          }
        />

        <Card className="stack">
          <div className="row-between">
            <strong>Rider</strong>
            <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              {view.riderFirstName} · {view.riderVehicle ?? '—'}
            </span>
          </div>
          <div className="row-between">
            <strong>Package</strong>
            <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              {view.package.category}
              {view.package.food ? ' · sealed food' : ''}
            </span>
          </div>
          <div className="row-between">
            <strong>Distance</strong>
            <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>{view.route.distanceKm} km</span>
          </div>
        </Card>

        <Card className="stack" style={{ borderColor: 'var(--root-700)' }}>
          <div className="data-label">Your delivery code — give this to the rider at your door</div>
          <div className="code-box mono" style={{ fontSize: 28, letterSpacing: '0.35em', fontWeight: 800, textAlign: 'center', padding: '10px 0' }}>
            {view.deliveryCode}
          </div>
          <p className="muted" style={{ fontSize: 'var(--text-xs)' }}>
            The rider must enter this code to complete the delivery. Never share it anywhere except with the rider at handover.
          </p>
        </Card>

        <Card className="stack" pad={false}>
          <div className="data-label" style={{ padding: '14px 16px 0' }}>Progress</div>
          <ol style={{ listStyle: 'none', padding: '10px 16px 16px', margin: 0 }} aria-label="Delivery progress">
            {[...view.statusHistory].reverse().map((h, i) => (
              <li key={`${h.status}-${h.at}`} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '7px 0' }}>
                <span
                  aria-hidden
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 999,
                    marginTop: 5,
                    flexShrink: 0,
                    background: i === 0 ? 'var(--grad-accent)' : 'var(--earth-600)',
                    boxShadow: i === 0 ? '0 0 10px oklch(0.72 0.17 300 / 0.7)' : 'none',
                  }}
                />
                <div>
                  <div style={{ fontWeight: i === 0 ? 700 : 500, fontSize: 'var(--text-sm)' }}>{statusLabel(h.status)}</div>
                  <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                    {fmtDay(h.at, now)} · {fmtTime(h.at)}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <Banner tone="info" title="This link is private">
          It works only until it expires, and the sender can revoke it at any time. It shows this delivery only — never any
          account data. If anything feels unsafe, use the report below; emergency reporting is always available.
        </Banner>

        <div className="row" style={{ gap: 10 }}>
          <Button variant="secondary" icon={Flag} onClick={() => setReportOpen(true)}>
            Report a problem
          </Button>
          <span className="row muted" style={{ gap: 6, fontSize: 'var(--text-xs)' }}>
            <ShieldCheck size={14} /> Every report is reviewed by a person — nothing is automated.
          </span>
        </div>

        <p className="faint" style={{ fontSize: 'var(--text-2xs)', paddingBottom: 24 }}>
          ROOT-X · campus delivery by verified students · design concept — no affiliation with or endorsement by UNIOSUN is claimed.
        </p>
      </main>

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Report a problem">
        <div className="stack">
          <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
            Describe what happened with {view.ref}. Reports are attached to the delivery record and reviewed by the ROOT-X team —
            no automated penalties are ever applied.
          </p>
          <Field label="What happened?" htmlFor="guest-report">
            <TextArea id="guest-report" value={reportDesc} onChange={(e) => setReportDesc((e.target as HTMLTextAreaElement).value)} placeholder="e.g. the rider asked me to share my code over chat" />
          </Field>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setReportOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={reportDesc.trim().length < 10}
              onClick={() => {
                setReportOpen(false);
                setReportDesc('');
                toast('Report received — a person will review it and follow up.', 'success');
              }}
            >
              Send report
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function statusLabel(s: DeliveryStatus): string {
  const map: Record<string, string> = {
    draft: 'Draft',
    awaiting_payment: 'Awaiting payment',
    payment_processing: 'Payment processing',
    awaiting_rider: 'Finding a rider',
    offered_to_riders: 'Finding a rider',
    rider_assigned: 'Rider assigned',
    rider_approaching_pickup: 'Rider on the way to pickup',
    at_pickup: 'Rider at pickup',
    pickup_verification_pending: 'Verifying pickup code',
    package_collected: 'Package collected',
    in_transit: 'In transit',
    approaching_destination: 'Approaching destination',
    delivery_verification_pending: 'Verifying delivery code',
    delivered: 'Delivered',
    cancellation_requested: 'Cancellation requested',
    cancelled: 'Cancelled',
    return_required: 'Returning to sender',
    disputed: 'Disputed',
    under_review: 'Under review',
  };
  return map[s] ?? s;
}
