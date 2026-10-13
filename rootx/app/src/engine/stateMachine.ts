import type { DeliveryStatus } from './types';

/* ============================================================================
   ROOT-X delivery state machine.
   ----------------------------------------------------------------------------
   All transitions are validated server-side in production (clients can never
   mark an order paid/collected/delivered directly). This module is the single
   source of truth for the prototype and is unit-tested (src/engine/*.test.ts).
   ========================================================================== */

/** Ordered milestone groups used by the tracking timeline. */
export const STATUS_ORDER: DeliveryStatus[] = [
  'draft',
  'awaiting_payment',
  'payment_processing',
  'awaiting_rider',
  'offered_to_riders',
  'rider_assigned',
  'rider_approaching_pickup',
  'at_pickup',
  'pickup_verification_pending',
  'package_collected',
  'in_transit',
  'approaching_destination',
  'delivery_verification_pending',
  'delivered',
];

export const TERMINAL_STATUSES: DeliveryStatus[] = ['delivered', 'cancelled'];

export const CANCELLABLE: DeliveryStatus[] = [
  'awaiting_rider',
  'offered_to_riders',
  'rider_assigned',
  'rider_approaching_pickup',
  'at_pickup',
  'pickup_verification_pending',
  'package_collected',
  'in_transit',
  'approaching_destination',
  'delivery_verification_pending',
];

/** Explicit transition table. Anything not listed is invalid. */
const TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  draft: ['awaiting_payment'],
  awaiting_payment: ['payment_processing', 'cancelled', 'draft'],
  payment_processing: ['awaiting_rider', 'awaiting_payment', 'cancelled'],
  awaiting_rider: ['offered_to_riders', 'cancelled'],
  offered_to_riders: ['rider_assigned', 'awaiting_rider', 'cancelled'],
  rider_assigned: ['rider_approaching_pickup', 'cancelled', 'cancellation_requested'],
  rider_approaching_pickup: ['at_pickup', 'cancelled', 'cancellation_requested'],
  at_pickup: ['pickup_verification_pending', 'cancelled', 'cancellation_requested'],
  pickup_verification_pending: ['package_collected', 'return_required', 'cancelled'],
  package_collected: ['in_transit', 'return_required', 'cancelled', 'cancellation_requested'],
  in_transit: ['approaching_destination', 'return_required', 'cancelled', 'disputed'],
  approaching_destination: ['delivery_verification_pending', 'return_required', 'disputed'],
  delivery_verification_pending: ['delivered', 'return_required', 'disputed'],
  delivered: ['disputed'],
  cancellation_requested: ['cancelled', 'package_collected', 'in_transit'],
  cancelled: [],
  return_required: ['in_transit', 'cancelled', 'under_review'], // redelivery attempt or return
  disputed: ['under_review', 'delivered', 'cancelled'],
  under_review: ['delivered', 'cancelled', 'return_required', 'in_transit'],
};

export function canTransition(from: DeliveryStatus, to: DeliveryStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export interface TransitionResult {
  ok: boolean;
  reason?: string;
}

/**
 * Guarded transition — encodes rules that the table alone can't express.
 * `evidence` proves prerequisites (payment, verification codes) that clients
 * can never assert themselves.
 */
export function transition(
  from: DeliveryStatus,
  to: DeliveryStatus,
  evidence: {
    paymentSucceeded?: boolean;
    pickupCodeVerified?: boolean;
    deliveryCodeVerified?: boolean;
    riderAssigned?: boolean;
  } = {},
): TransitionResult {
  if (from === to) return { ok: false, reason: 'No-op transition' };
  if (!canTransition(from, to)) {
    return { ok: false, reason: `Illegal transition ${from} → ${to}` };
  }
  if (to === 'awaiting_rider' && !evidence.paymentSucceeded) {
    return { ok: false, reason: 'Payment must succeed before rider matching' };
  }
  if (to === 'package_collected' && !evidence.pickupCodeVerified) {
    return { ok: false, reason: 'Pickup code must be verified before collection' };
  }
  if (to === 'delivered' && !evidence.deliveryCodeVerified) {
    return { ok: false, reason: 'Delivery code must be verified before marking delivered' };
  }
  if (
    ['rider_approaching_pickup', 'at_pickup', 'pickup_verification_pending', 'package_collected', 'in_transit', 'approaching_destination', 'delivery_verification_pending'].includes(to) &&
    !evidence.riderAssigned
  ) {
    return { ok: false, reason: 'A rider must be assigned first' };
  }
  return { ok: true };
}

/** Rough progress 0..1 for UI meters (non-normative). */
export function statusProgress(s: DeliveryStatus): number {
  const i = STATUS_ORDER.indexOf(s);
  if (s === 'cancelled') return 0;
  if (i < 0) return 0.6; // disputed / review states
  return i / (STATUS_ORDER.length - 1);
}

/** Stage key for cancellation fee policy. */
export function cancellationStage(s: DeliveryStatus): number {
  const idx = STATUS_ORDER.indexOf(s);
  if (idx <= 4) return 0; // before assignment
  if (idx <= 6) return 1; // assigned, traveling to pickup
  if (idx <= 8) return 2; // at pickup
  return 3; // collected / in transit
}
