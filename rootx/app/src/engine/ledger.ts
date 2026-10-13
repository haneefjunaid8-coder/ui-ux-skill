import type { LedgerRecord, PricingConfig } from './types';
import { splitLedger } from './pricing';

/* ============================================================================
   ROOT-X financial ledger — wallet/ledger records, not profile fields.
   ----------------------------------------------------------------------------
   Invariant (tested): charge − gatewayFee − commission − Σadjustments =
   riderNet. Refunds create explicit adjustment entries. Settlement is a
   separate, audited state transition. Production stores kobo integers in
   PostgreSQL with double-entry-style rows — see docs/10-payments.md.
   ========================================================================== */

export function buildLedger(charge: number, config: PricingConfig): LedgerRecord {
  const { gatewayFee, commission, riderNet } = splitLedger(charge, config, []);
  return {
    deliveryId: '',
    charge,
    gatewayFee,
    commission,
    adjustments: [],
    riderNet,
    refunded: 0,
    settlement: 'pending',
    settledAt: null,
    payoutId: null,
  };
}

export function assertLedgerInvariant(l: LedgerRecord): { ok: boolean; diff: number } {
  const adj = l.adjustments.reduce((a, x) => a + x.amount, 0);
  const expected = l.charge - l.gatewayFee - l.commission - adj - l.refunded;
  const diff = expected - l.riderNet;
  return { ok: Math.abs(diff) < 0.001, diff };
}

/** Apply a refund. Invariant preserved: charge − gatewayFee − commission −
 *  Σadjustments − refunded = riderNet. A rider-share refund reduces riderNet
 *  via `refunded`; a platform-share refund is a negative adjustment (the
 *  platform puts money back into the rider pot). */
export function applyRefund(
  l: LedgerRecord,
  refundAmount: number,
  fromRiderShare: boolean,
  reason: string,
): LedgerRecord {
  const riderPortion = fromRiderShare ? Math.min(refundAmount, Math.max(0, l.riderNet)) : 0;
  const platformPortion = refundAmount - riderPortion;
  return {
    ...l,
    refunded: l.refunded + refundAmount,
    riderNet: l.riderNet - riderPortion,
    settlement: 'pending',
    adjustments: [
      ...l.adjustments,
      { label: `Refund — ${reason} (customer ₦${refundAmount}; rider share ₦${riderPortion}, platform share ₦${platformPortion})`, amount: -platformPortion },
    ],
  };
}

export function settleLedgers(records: LedgerRecord[], at: number, payoutId: string): LedgerRecord[] {
  return records.map((l) =>
    l.settlement === 'ready' && l.riderNet - l.refunded > 0
      ? { ...l, settlement: 'settled', settledAt: at, payoutId }
      : l,
  );
}

export interface ReconciliationSummary {
  grossCharges: number;
  gatewayFees: number;
  commissions: number;
  riderNet: number;
  refunds: number;
  invariantsOk: boolean;
  rows: { deliveryId: string; ok: boolean; diff: number }[];
}

export function reconcile(records: LedgerRecord[]): ReconciliationSummary {
  const rows = records.map((l) => {
    const adj = l.adjustments.reduce((a, x) => a + x.amount, 0);
    const diff = l.charge - l.gatewayFee - l.commission - adj - l.refunded - l.riderNet;
    return { deliveryId: l.deliveryId, ok: Math.abs(diff) < 0.001, diff };
  });
  return {
    grossCharges: records.reduce((a, l) => a + l.charge, 0),
    gatewayFees: records.reduce((a, l) => a + l.gatewayFee, 0),
    commissions: records.reduce((a, l) => a + l.commission, 0),
    riderNet: records.reduce((a, l) => a + l.riderNet - l.refunded, 0),
    refunds: records.reduce((a, l) => a + l.refunded, 0),
    invariantsOk: rows.every((r) => r.ok),
    rows,
  };
}

export function fmtNaira(n: number): string {
  return '₦' + Math.round(n).toLocaleString('en-NG');
}
