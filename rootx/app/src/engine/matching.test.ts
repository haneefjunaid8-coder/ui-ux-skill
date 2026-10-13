import { describe, expect, it } from 'vitest';
import { eligibleRiders } from './matching';
import { POLICIES_DEFAULTS } from './config';
import type { Delivery, RiderProfile } from './types';

function makeDelivery(overrides: Partial<Delivery> = {}): Delivery {
  return {
    id: 'd-test',
    ref: 'RX-TEST',
    customerId: 'u-ada',
    createdAt: 0,
    kind: 'immediate',
    scheduledFor: null,
    recurrenceId: null,
    stops: [{ id: 's1', kind: 'pickup', label: 'Library', x: 250, y: 250, zoneId: 'osogbo-campus' }],
    package: {
      description: 'Docs',
      category: 'documents',
      quantity: 1,
      weightKg: 5,
      dimensions: { l: 30, w: 22, h: 5 },
      sizeTier: 'small',
      photos: ['x'],
      fragile: false,
      food: false,
      declaredValue: null,
      handlingNotes: '',
      contentsDeclared: true,
    },
    status: 'offered_to_riders',
    statusHistory: [],
    riderId: null,
    offer: null,
    quote: { lines: [], total: 1000, distanceKm: 1, etaMinutes: 15, currency: 'NGN' },
    payment: null,
    ledger: null,
    trackingToken: { token: 't', expiresAt: 0, revoked: false },
    pickupCode: '1111',
    deliveryCode: '2222',
    verification: { pickupAttempts: 0, deliveryAttempts: 0, pickupLockedUntil: null, deliveryLockedUntil: null, pickupVerifiedAt: null, deliveryVerifiedAt: null },
    route: { points: [], distanceKm: 1, etaMinutes: 15 },
    riderProgress: 0,
    riderLocation: null,
    cancelReason: null,
    cancelledAt: null,
    cancelledBy: null,
    disputeId: null,
    safetyFlags: [],
    rating: null,
    ...overrides,
  } as Delivery;
}

function makeRider(overrides: Partial<RiderProfile> = {}): RiderProfile {
  return {
    id: 'r-1',
    userId: '',
    applicationId: 'app-x',
    transport: 'bicycle',
    capacityKg: 12,
    capacityLiters: 40,
    zoneId: 'osogbo-campus',
    isAvailable: true,
    simulated: true,
    workingHours: [],
    rating: 4.5,
    completed: 30,
    onTimeRate: 0.93,
    pendingEarnings: 0,
    availableEarnings: 0,
    location: { x: 260, y: 260 },
    locationUpdatedAt: 0,
    ...overrides,
  };
}

describe('rider matching', () => {
  it('accepts a suitable nearby rider', () => {
    const { eligible } = eligibleRiders(makeDelivery(), [makeRider()], POLICIES_DEFAULTS);
    expect(eligible).toHaveLength(1);
    expect(eligible[0].reasons.length).toBeGreaterThan(0);
  });

  it('rejects riders outside the pickup zone, unavailable, over capacity, or without GPS', () => {
    const riders = [
      makeRider({ id: 'r-z', zoneId: 'oke-baale' }),
      makeRider({ id: 'r-off', isAvailable: false }),
      makeRider({ id: 'r-heavy', capacityKg: 3 }),
      makeRider({ id: 'r-nogps', location: null }),
    ];
    const { eligible, rejected } = eligibleRiders(makeDelivery(), riders, POLICIES_DEFAULTS);
    expect(eligible).toHaveLength(0);
    expect(rejected).toHaveLength(4);
    expect(rejected.find((r) => r.rider.id === 'r-z')!.reason).toContain('zone');
    expect(rejected.find((r) => r.rider.id === 'r-heavy')!.reason).toContain('capacity');
  });

  it('excludes foot riders from fragile deliveries', () => {
    const d = makeDelivery({ package: { ...makeDelivery().package, fragile: true } });
    const { rejected } = eligibleRiders(d, [makeRider({ id: 'r-foot', transport: 'foot' })], POLICIES_DEFAULTS);
    expect(rejected[0].reason).toContain('fragile');
  });

  it('requires a strong reliability record for high-value deliveries', () => {
    const d = makeDelivery({ package: { ...makeDelivery().package, declaredValue: 60000 } });
    const { eligible, rejected } = eligibleRiders(d, [makeRider({ id: 'r-new', rating: 4.0, completed: 5 })], POLICIES_DEFAULTS);
    expect(eligible).toHaveLength(0);
    expect(rejected[0].reason).toContain('High-value');
    const { eligible: ok } = eligibleRiders(d, [makeRider({ id: 'r-pro', rating: 4.8, completed: 120 })], POLICIES_DEFAULTS);
    expect(ok).toHaveLength(1);
  });

  it('rejects riders too far from pickup', () => {
    const { rejected } = eligibleRiders(makeDelivery(), [makeRider({ id: 'r-far', location: { x: 20, y: 20 } })], POLICIES_DEFAULTS);
    expect(rejected[0].reason).toContain('far');
  });

  it('ranks by score (proximity, rating, punctuality)', () => {
    const near = makeRider({ id: 'r-near', rating: 4.9, onTimeRate: 0.99, location: { x: 252, y: 252 } });
    const far = makeRider({ id: 'r-farther', rating: 4.2, onTimeRate: 0.85, location: { x: 320, y: 330 } });
    const { eligible } = eligibleRiders(makeDelivery(), [far, near], POLICIES_DEFAULTS);
    expect(eligible[0].rider.id).toBe('r-near');
  });
});
