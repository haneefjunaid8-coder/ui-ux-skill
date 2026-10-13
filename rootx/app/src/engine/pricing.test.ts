import { describe, expect, it } from 'vitest';
import { quote, validatePackage, splitLedger, estimateEtaMinutes } from './pricing';
import { PRICING_DEFAULTS } from './config';
import type { PackageInfo } from './types';

const basePkg: PackageInfo = {
  description: 'Documents',
  category: 'documents',
  quantity: 1,
  weightKg: 1,
  dimensions: { l: 30, w: 22, h: 5 },
  sizeTier: 'small',
  photos: ['data:image/png;base64,x'],
  fragile: false,
  food: false,
  declaredValue: null,
  handlingNotes: '',
  contentsDeclared: true,
};

const stops2 = [
  { x: 250, y: 420 },
  { x: 300, y: 460 },
]; // ~64 units ≈ 0.64 km → within included km

const stopsFar = [
  { x: 150, y: 150 },
  { x: 420, y: 450 },
];

describe('pricing engine', () => {
  it('quotes base fare for a short small run and respects the minimum', () => {
    const q = quote({ stops: stops2, pkg: basePkg, transport: 'motorcycle', config: PRICING_DEFAULTS });
    expect(q.total).toBe(PRICING_DEFAULTS.minFare); // below minimum → min fare
    expect(q.lines[0].amount).toBe(PRICING_DEFAULTS.baseFare);
  });

  it('charges billable distance beyond the included km', () => {
    const q = quote({ stops: stopsFar, pkg: basePkg, transport: 'motorcycle', config: PRICING_DEFAULTS });
    const dist = q.lines.find((l) => l.key === 'distance');
    expect(dist).toBeTruthy();
    expect(dist!.amount).toBeGreaterThan(0);
    expect(q.distanceKm).toBeGreaterThan(1);
  });

  it('adds size, weight, fragile, food and multi-stop fees itemised', () => {
    const q = quote({
      stops: [
        { x: 150, y: 150 },
        { x: 250, y: 250 },
        { x: 350, y: 350 },
      ],
      pkg: { ...basePkg, weightKg: 8, sizeTier: 'medium', fragile: true, food: true },
      transport: 'motorcycle',
      config: PRICING_DEFAULTS,
    });
    expect(q.lines.find((l) => l.key === 'size')!.amount).toBe(PRICING_DEFAULTS.sizeTierFees.medium);
    expect(q.lines.find((l) => l.key === 'weight')!.amount).toBe(3 * PRICING_DEFAULTS.perExtraKg);
    expect(q.lines.find((l) => l.key === 'fragile')!.amount).toBe(PRICING_DEFAULTS.fragileFee);
    expect(q.lines.find((l) => l.key === 'food')!.amount).toBe(PRICING_DEFAULTS.foodSealedFee);
    expect(q.lines.find((l) => l.key === 'stops')!.amount).toBe(PRICING_DEFAULTS.extraStopFee);
    const sum = q.lines.reduce((a, l) => a + l.amount, 0);
    expect(q.total).toBe(Math.max(PRICING_DEFAULTS.minFare, sum));
  });

  it('applies a capped high-value handling percentage', () => {
    const q = quote({
      stops: stops2,
      pkg: { ...basePkg, declaredValue: 50000 },
      transport: 'motorcycle',
      config: PRICING_DEFAULTS,
    });
    const hv = q.lines.find((l) => l.key === 'highvalue')!;
    expect(hv.amount).toBe(Math.min(PRICING_DEFAULTS.highValueFeeCap, (50000 * PRICING_DEFAULTS.highValuePct) / 100));
  });

  it('is deterministic — same inputs, same quote', () => {
    const a = quote({ stops: stopsFar, pkg: { ...basePkg, weightKg: 6 }, transport: 'bicycle', config: PRICING_DEFAULTS });
    const b = quote({ stops: stopsFar, pkg: { ...basePkg, weightKg: 6 }, transport: 'bicycle', config: PRICING_DEFAULTS });
    expect(a.total).toBe(b.total);
    expect(a.lines).toEqual(b.lines);
  });

  it('validates package rules: photo required, declaration required, caps enforced', () => {
    const noPhoto = validatePackage({ ...basePkg, photos: [] }, PRICING_DEFAULTS);
    expect(noPhoto.ok).toBe(false);
    expect(noPhoto.errors.some((e) => e.includes('photograph'))).toBe(true);

    const undeclared = validatePackage({ ...basePkg, contentsDeclared: false }, PRICING_DEFAULTS);
    expect(undeclared.ok).toBe(false);

    const tooHeavy = validatePackage({ ...basePkg, weightKg: 40 }, PRICING_DEFAULTS);
    expect(tooHeavy.ok).toBe(false);

    const overValue = validatePackage({ ...basePkg, declaredValue: 200000 }, PRICING_DEFAULTS);
    expect(overValue.ok).toBe(false);

    const highValue = validatePackage({ ...basePkg, declaredValue: 60000 }, PRICING_DEFAULTS);
    expect(highValue.ok).toBe(true);
    expect(highValue.isHighValue).toBe(true);
    expect(highValue.warnings.some((w) => w.includes('insurance'))).toBe(true);
  });

  it('splits a charge into an auditable ledger', () => {
    const { gatewayFee, commission, riderNet } = splitLedger(2000, PRICING_DEFAULTS);
    expect(gatewayFee).toBe(Math.round(PRICING_DEFAULTS.gatewayFeeFixed + (2000 * PRICING_DEFAULTS.gatewayFeePct) / 100));
    expect(commission).toBe(Math.round((2000 * PRICING_DEFAULTS.commissionPct) / 100));
    expect(2000 - gatewayFee - commission).toBe(riderNet);
  });

  it('estimates ETA with stop and handling overheads', () => {
    const eta = estimateEtaMinutes(2, [{}, {}] as never, { ...basePkg, fragile: true }, 'bicycle');
    expect(eta).toBeGreaterThanOrEqual(10);
  });
});
