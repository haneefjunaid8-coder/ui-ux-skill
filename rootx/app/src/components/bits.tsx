import React from 'react';
import {
  CheckCircle2,
  CreditCard,
  FileText,
  KeySquare,
  Loader2,
  MapPin,
  Moon,
  Navigation,
  Package,
  Radio,
  Scale,
  Search,
  ShieldAlert,
  Sun,
  Sunset,
  UserCheck,
  Undo2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Pill, type PillTone, type IconType } from '../ds';
import type { DeliveryStatus } from '../engine/types';
import type { ServicePhase } from '../engine/safety';

/* ---- money ------------------------------------------------------------------ */

export function Money({ value, size, className = '' }: { value: number; size?: string; className?: string }) {
  return (
    <span className={`mono ${className}`} style={size ? { fontSize: size } : undefined}>
      ₦{Math.round(value).toLocaleString('en-NG')}
    </span>
  );
}

/* ---- time --------------------------------------------------------------------- */

export function fmtTime(epoch: number): string {
  return new Date(epoch).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' });
}

export function fmtDay(epoch: number, now: number): string {
  const d = new Date(epoch);
  const n = new Date(now);
  const sameDay = d.toDateString() === n.toDateString();
  const yesterday = new Date(now - 86_400_000).toDateString() === d.toDateString();
  if (sameDay) return 'Today';
  if (yesterday) return 'Yesterday';
  return d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function timeAgo(epoch: number, now: number): string {
  const s = Math.max(0, Math.round((now - epoch) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

/* ---- delivery status pill -------------------------------------------------------- */

export const STATUS_META: Record<DeliveryStatus, { label: string; tone: PillTone; icon: IconType }> = {
  draft: { label: 'Draft', tone: 'hold', icon: FileText },
  awaiting_payment: { label: 'Awaiting payment', tone: 'wait', icon: CreditCard },
  payment_processing: { label: 'Payment processing', tone: 'wait', icon: Loader2 },
  awaiting_rider: { label: 'Finding rider', tone: 'wait', icon: Search },
  offered_to_riders: { label: 'Offered to riders', tone: 'wait', icon: Radio },
  rider_assigned: { label: 'Rider assigned', tone: 'motion', icon: UserCheck },
  rider_approaching_pickup: { label: 'Rider approaching', tone: 'motion', icon: Navigation },
  at_pickup: { label: 'At pickup', tone: 'motion', icon: MapPin },
  pickup_verification_pending: { label: 'Pickup verification', tone: 'wait', icon: KeySquare },
  package_collected: { label: 'Package collected', tone: 'motion', icon: Package },
  in_transit: { label: 'In transit', tone: 'motion', icon: Navigation },
  approaching_destination: { label: 'Approaching', tone: 'motion', icon: Navigation },
  delivery_verification_pending: { label: 'Delivery verification', tone: 'wait', icon: KeySquare },
  delivered: { label: 'Delivered', tone: 'go', icon: CheckCircle2 },
  cancellation_requested: { label: 'Cancellation requested', tone: 'wait', icon: XCircle },
  cancelled: { label: 'Cancelled', tone: 'hold', icon: XCircle },
  return_required: { label: 'Return required', tone: 'wait', icon: Undo2 },
  disputed: { label: 'Disputed', tone: 'alert', icon: ShieldAlert },
  under_review: { label: 'Under review', tone: 'alert', icon: Scale },
};

export function DeliveryStatusPill({ status }: { status: DeliveryStatus }) {
  const meta = STATUS_META[status];
  return (
    <Pill tone={meta.tone} icon={meta.icon}>
      {meta.label}
    </Pill>
  );
}

/* ---- service-hours chip (dusk signature) -------------------------------------------- */

const PHASE_META: Record<ServicePhase, { label: string; icon: IconType; tone: PillTone }> = {
  open: { label: 'Service open', icon: Sun, tone: 'go' },
  warning: { label: '6 PM notice', icon: Sunset, tone: 'wait' },
  cutoff: { label: 'Last calls cut off', icon: AlertTriangle, tone: 'wait' },
  closed: { label: 'Closed for safety', icon: Moon, tone: 'hold' },
};

export function ServiceStatusChip({ phase, time }: { phase: ServicePhase; time: string }) {
  const m = PHASE_META[phase];
  return (
    <Pill tone={m.tone} icon={m.icon}>
      <span className="mono" style={{ fontWeight: 600 }}>
        {time}
      </span>
      {' · '}
      {m.label}
    </Pill>
  );
}

/* ---- photo tile ------------------------------------------------------------------------- */

export function PhotoTile({ src, onRemove, alt }: { src: string; onRemove?: () => void; alt: string }) {
  return (
    <div style={{ position: 'relative', borderRadius: 'var(--r-sm)', overflow: 'hidden', border: '1px solid var(--line)', width: 84, height: 64, flexShrink: 0 }}>
      <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label="Remove photo"
          style={{ position: 'absolute', top: 3, right: 3, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'oklch(0.1 0.02 258 / 0.7)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <XCircle size={13} />
        </button>
      )}
    </div>
  );
}
