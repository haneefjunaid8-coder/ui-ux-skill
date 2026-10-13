import { describe, expect, it } from 'vitest';
import { canTransition, transition, cancellationStage, statusProgress } from './stateMachine';

describe('delivery state machine', () => {
  it('allows the happy path draft → delivered', () => {
    const path = [
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
    ] as const;
    let from: (typeof path)[number] | 'draft' = 'draft';
    for (const to of path) {
      expect(canTransition(from, to), `${from} → ${to}`).toBe(true);
      from = to;
    }
  });

  it('rejects illegal jumps', () => {
    expect(transition('draft', 'delivered').ok).toBe(false);
    expect(transition('awaiting_payment', 'in_transit').ok).toBe(false);
    expect(transition('cancelled', 'in_transit').ok).toBe(false);
    expect(transition('delivered', 'in_transit').ok).toBe(false);
  });

  it('requires payment evidence before matching', () => {
    expect(transition('payment_processing', 'awaiting_rider', {}).ok).toBe(false);
    expect(transition('payment_processing', 'awaiting_rider', { paymentSucceeded: true }).ok).toBe(true);
  });

  it('requires verified codes for collection and delivery', () => {
    expect(transition('pickup_verification_pending', 'package_collected', { riderAssigned: true }).ok).toBe(false);
    expect(transition('pickup_verification_pending', 'package_collected', { riderAssigned: true, pickupCodeVerified: true }).ok).toBe(true);
    expect(transition('delivery_verification_pending', 'delivered', { riderAssigned: true }).ok).toBe(false);
    expect(transition('delivery_verification_pending', 'delivered', { riderAssigned: true, deliveryCodeVerified: true }).ok).toBe(true);
  });

  it('requires an assigned rider for on-road states', () => {
    expect(transition('rider_assigned', 'in_transit', { paymentSucceeded: true, pickupCodeVerified: true }).ok).toBe(false);
  });

  it('supports cancellation, return and dispute branches', () => {
    expect(transition('in_transit', 'cancelled').ok).toBe(true);
    expect(transition('in_transit', 'return_required').ok).toBe(true);
    expect(transition('delivery_verification_pending', 'disputed').ok).toBe(true);
    expect(transition('return_required', 'in_transit', { riderAssigned: true, paymentSucceeded: true }).ok).toBe(true); // redelivery attempt by the assigned rider
    expect(transition('disputed', 'under_review').ok).toBe(true);
  });

  it('maps cancellation stages monotonically', () => {
    expect(cancellationStage('awaiting_rider')).toBe(0);
    expect(cancellationStage('rider_assigned')).toBe(1);
    expect(cancellationStage('at_pickup')).toBe(2);
    expect(cancellationStage('in_transit')).toBe(3);
    expect(statusProgress('delivered')).toBe(1);
  });
});
