import { describe, expect, it } from 'vitest';
import { buildLedger, assertLedgerInvariant, applyRefund, reconcile, settleLedgers } from './ledger';
import { PRICING_DEFAULTS } from './config';
import type { LedgerRecord } from './types';

function rec(overrides: Partial<LedgerRecord> = {}): LedgerRecord {
  return { ...buildLedger(2000, PRICING_DEFAULTS), deliveryId: 'd-1', ...overrides };
}

describe('financial ledger', () => {
  it('builds rows that satisfy the core invariant', () => {
    const l = buildLedger(2500, PRICING_DEFAULTS);
    expect(assertLedgerInvariant({ ...l, deliveryId: 'd-x' }).ok).toBe(true);
    expect(l.charge - l.gatewayFee - l.commission).toBe(l.riderNet);
  });

  it('keeps the invariant after refunds with and without rider share', () => {
    const fromRider = applyRefund(rec(), 500, true, 'damaged package');
    expect(assertLedgerInvariant(fromRider).ok).toBe(true);
    const fromPlatform = applyRefund(rec(), 500, false, 'goodwill');
    expect(assertLedgerInvariant(fromPlatform).ok).toBe(true);
    expect(fromPlatform.riderNet).toBeGreaterThan(fromRider.riderNet);
  });

  it('detects broken invariants (tamper detection)', () => {
    const bad = rec({ riderNet: rec().riderNet + 100 });
    expect(assertLedgerInvariant(bad).ok).toBe(false);
  });

  it('reconciles across many rows and reports totals', () => {
    const rows = [rec({ deliveryId: 'a' }), rec({ deliveryId: 'b', charge: 3000, commission: 450, gatewayFee: 145, riderNet: 2405 }), rec({ deliveryId: 'c' })];
    const r = reconcile(rows);
    expect(r.invariantsOk).toBe(true);
    expect(r.grossCharges).toBe(2000 + 3000 + 2000);
    expect(r.commissions).toBe(rows.reduce((a, x) => a + x.commission, 0));
  });

  it('settles only ready rows and stamps payout references', () => {
    const rows = [rec({ deliveryId: 'a', settlement: 'ready' }), rec({ deliveryId: 'b', settlement: 'pending' })];
    const settled = settleLedgers(rows, 999, 'sb-1');
    const a = settled.find((x) => x.deliveryId === 'a')!;
    const b = settled.find((x) => x.deliveryId === 'b')!;
    expect(a.settlement).toBe('settled');
    expect(a.settledAt).toBe(999);
    expect(a.payoutId).toBe('sb-1');
    expect(b.settlement).toBe('pending');
  });
});
