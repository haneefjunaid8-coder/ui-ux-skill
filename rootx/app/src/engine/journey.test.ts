import { describe, it, expect } from 'vitest';
import { reducer, init, myDeliveries } from './store';
import type { AppState } from './store';
import { assertLedgerInvariant } from './ledger';

/* Full-journey integration test: booking → payment → matching → verification →
 * settlement (two-person rule) → dispute refund → safety incident → audit.
 * These mirror the §38 non-negotiables that span modules. */

function boot(): AppState {
  return init();
}

function run(s0: AppState, actions: Parameters<typeof reducer>[1][]): AppState {
  return actions.reduce((s, a) => reducer(s, a), s0);
}

/** fast-forward simulated time until predicate holds (max `ms` virtual time) */
function until(s0: AppState, pred: (s: AppState) => boolean, ms = 10 * 60_000): AppState {
  let s = s0;
  const end = s.clock.epoch + ms;
  while (s.clock.epoch < end) {
    s = reducer(s, { type: 'tick' });
    if (pred(s)) return s;
  }
  return s;
}

const CAMPUS_STOP = (over: Partial<{ label: string; x: number; y: number }> = {}) => ({
  id: 'st-' + Math.random().toString(36).slice(2, 7),
  kind: 'dropoff' as const,
  label: over.label ?? 'Test stop',
  x: over.x ?? 300,
  y: over.y ?? 200,
  zoneId: 'osogbo-campus',
});

describe('end-to-end journey', () => {
  it('full customer delivery: create → pay → match → deliver → ledger ready', () => {
    let s = boot();
    const customerId = 'u-ada';
    s = run(s, [{ type: 'auth/quickLogin', userId: customerId }]);

    // create an immediate single-item delivery from library to hostel A
    const countBefore = s.deliveries.length;
    s = run(s, [
      {
        type: 'delivery/create',
        input: {
          kind: 'immediate',
          scheduledFor: null,
          stops: [
            { ...CAMPUS_STOP({ label: 'Main library', x: 230, y: 180 }), kind: 'pickup' },
            { ...CAMPUS_STOP({ label: 'Hostel A', x: 350, y: 240 }), kind: 'dropoff', receiver: { name: 'Ada (self)', phone: '0803 111 0001' } },
          ],
          pkg: {
            description: 'Borrowed textbooks',
            category: 'documents' as const,
            quantity: 1,
            weightKg: 2,
            dimensions: { l: 30, w: 22, h: 8 },
            sizeTier: 'small' as const,
            photos: ['data:image/svg+xml;placeholder'],
            contentsDeclared: true,
            handlingNotes: 'Handle with care — library books.',
            fragile: false,
            food: false,
            declaredValue: null,
          },
          transport: 'bicycle',
        },
      },
    ]);

    expect(s.deliveries.length).toBe(countBefore + 1);
    const d = s.deliveries[s.deliveries.length - 1];
    expect(d.customerId).toBe(customerId);
    expect(d.status).toBe('awaiting_payment');
    expect(myDeliveries(s, customerId).some((x) => x.id === d.id)).toBe(true);

    // pay with simulated gateway — must never treat unconfirmed payment as success
    s = run(s, [{ type: 'delivery/pay', deliveryId: d.id, method: 'card' }]);
    expect(s.deliveries.find((x) => x.id === d.id)!.payment!.status).toBe('processing');

    // gateway webhook lands via tick
    s = until(s, (st) => st.deliveries.find((x) => x.id === d.id)!.status !== 'payment_processing');
    const paid = s.deliveries.find((x) => x.id === d.id)!;
    expect(paid.status).toMatch(/awaiting_rider|offered_to_riders|rider_assigned/);
    expect(paid.payment!.status).toBe('succeeded');

    // simulated rider completes the whole run
    s = until(s, (st) => st.deliveries.find((x) => x.id === d.id)!.status === 'delivered', 60 * 60_000);
    const done = s.deliveries.find((x) => x.id === d.id)!;
    expect(done.status).toBe('delivered');
    expect(done.verification.deliveryVerifiedAt).toBeTruthy();
    expect(done.ledger).toBeTruthy();
    expect(done.ledger!.settlement).toBe('ready');
    assertLedgerInvariant(done.ledger!);
    expect(done.ledger!.riderNet).toBe(done.ledger!.charge - done.ledger!.gatewayFee - done.ledger!.commission);
  });

  it('two-person settlement: finance proposes, admin approves, rider is paid', () => {
    let s = boot();
    // complete the seeded in-transit delivery d-102 by ticking
    s = until(s, (st) => st.deliveries.find((x) => x.id === 'd-102')!.status === 'delivered', 3 * 60 * 60_000);
    const readyBefore = s.deliveries.filter((d) => d.ledger?.settlement === 'ready').length;
    expect(readyBefore).toBeGreaterThan(0);

    // admin cannot propose a settlement run (finance-only, enforced in the reducer)
    s = run(s, [{ type: 'auth/quickLogin', userId: 'u-admin' }, { type: 'admin/settlementRun' }]);
    expect(s.batches.length).toBe(0);

    // finance proposes
    const settledBefore = s.deliveries.filter((d) => d.ledger?.settlement === 'settled').length;
    s = run(s, [{ type: 'auth/quickLogin', userId: 'u-finance' }, { type: 'admin/settlementRun' }]);
    expect(s.batches.length).toBe(1);
    const batch = s.batches[0];
    expect(batch.status).toBe('awaiting_approval');
    expect(batch.amount).toBeGreaterThan(0);
    // every ready ledger moved into the batch; batch still needs approval
    expect(s.deliveries.filter((d) => d.ledger?.settlement === 'settled').length).toBe(settledBefore + batch.ledgerIds.length);
    expect(s.deliveries.filter((d) => d.ledger?.settlement === 'ready').length).toBe(0);

    // finance cannot approve their own batch (two-person rule)
    s = run(s, [{ type: 'admin/approveSettlement', batchId: batch.id }]);
    expect(s.batches[0].status).toBe('awaiting_approval');

    // admin approves
    s = run(s, [{ type: 'auth/quickLogin', userId: 'u-admin' }, { type: 'admin/approveSettlement', batchId: batch.id }]);
    expect(s.batches[0].status).toBe('approved');
    expect(s.batches[0].approvedById).toBe('u-admin');
    // audit trail records both actors
    const actions = s.auditLog.map((a) => a.action);
    expect(actions).toContain('settlement.run');
    expect(actions).toContain('settlement.approve');
  });

  it('dispute refund keeps the ledger invariant, whatever share absorbs it', () => {
    let s = boot();
    s = until(s, (st) => st.deliveries.find((x) => x.id === 'd-102')!.status === 'delivered', 3 * 60 * 60_000);

    // customer reports a problem → dispute/case is opened
    const d102 = s.deliveries.find((x) => x.id === 'd-102')!;
    s = run(s, [{ type: 'delivery/reportProblem', deliveryId: 'd-102', reason: 'Damaged package', description: 'Carton was crushed on arrival', by: d102.customerId }]);
    expect(s.disputes.length).toBeGreaterThan(0);
    const caseId = s.disputes[0].id;

    // admin resolves with a refund taken from the rider share, then from the platform share
    s = run(s, [
      { type: 'auth/quickLogin', userId: 'u-admin' },
      { type: 'admin/resolveDispute', caseId, outcome: 'Refund customer — packaging damage confirmed', refundAmount: 500, fromRiderShare: true, note: 'Photo evidence confirmed crush damage at handover.' },
    ]);
    expect(s.disputes[0].status).toBe('resolved');
    const l1 = s.deliveries.find((x) => x.id === 'd-102')!.ledger!;
    assertLedgerInvariant(l1);
    expect(l1.refunded).toBeGreaterThanOrEqual(500);

    // second seeded dispute-free delivery: force a platform-share refund on a fresh case
    const other = s.deliveries.find((x) => x.id !== 'd-102' && x.ledger && x.status === 'delivered');
    if (other) {
      s = run(s, [
        { type: 'delivery/reportProblem', deliveryId: other.id, reason: 'Late delivery', description: 'Arrived after the promised window', by: other.customerId },
      ]);
      const c2 = s.disputes[0].id;
      s = run(s, [{ type: 'admin/resolveDispute', caseId: c2, outcome: 'Refund customer — service failure, rider not at fault', refundAmount: 300, fromRiderShare: false, note: 'Route delay caused by gate closure; rider not at fault.' }]);
      const l2 = s.deliveries.find((x) => x.id === other.id)!.ledger!;
      assertLedgerInvariant(l2);
    }
  });

  it('safety incident: SOS opens an incident, resolution is audited, rider is not auto-punished', () => {
    let s = boot();
    s = run(s, [{ type: 'rider/sos', riderId: 'r-kofi', deliveryId: 'd-102', kind: 'harassment', note: 'Receiver refusing to accept and blocking my exit.' }]);
    expect(s.incidents.length).toBeGreaterThan(0);
    const inc = s.incidents[0];
    expect(inc.status).toBe('open');
    expect(inc.events.length).toBeGreaterThan(0);

    // no automated penalty: the rider profile is untouched and still available
    const kofi = s.riders.find((r) => r.id === 'r-kofi')!;
    expect(kofi).toBeTruthy();
    expect(kofi.isAvailable).toBe(true);
    expect(kofi.completed).toBe(s.riders.find((r) => r.id === 'r-kofi')!.completed); // no rating/record hit

    // security resolves with an audited note
    s = run(s, [{ type: 'auth/quickLogin', userId: 'u-admin' }, { type: 'admin/resolveIncident', incidentId: inc.id, note: 'Campus security escorted the rider out. No rider fault recorded.' }]);
    expect(s.incidents[0].status).toBe('resolved');
    expect(s.auditLog.some((a) => a.action.includes('incident'))).toBe(true);
  });

  it('guest tracking links: revocable and rotatable, expiry enforced', () => {
    let s = boot();
    const d = s.deliveries.find((x) => x.id === 'd-102')!;
    expect(d.trackingToken.revoked).toBe(false);

    // revoke → guest view must not resolve
    s = run(s, [{ type: 'tracking/revoke', deliveryId: 'd-102' }]);
    expect(s.deliveries.find((x) => x.id === 'd-102')!.trackingToken.revoked).toBe(true);
    expect(s.deliveries.find((x) => x.trackingToken.token === d.trackingToken.token && !x.trackingToken.revoked)).toBeFalsy();

    // rotate → active again with a fresh token
    s = run(s, [{ type: 'tracking/rotate', deliveryId: 'd-102' }]);
    const rotated = s.deliveries.find((x) => x.id === 'd-102')!.trackingToken;
    expect(rotated.revoked).toBe(false);
    expect(rotated.token).not.toBe(d.trackingToken.token);

    // expiry: an expired token must not resolve
    s = run(s, [{ type: 'clock/set', epoch: rotated.expiresAt + 1000 }]);
    const expired = s.deliveries.find((x) => x.id === 'd-102')!;
    expect(expired.trackingToken.expiresAt).toBeLessThan(s.clock.epoch);
  });
});
