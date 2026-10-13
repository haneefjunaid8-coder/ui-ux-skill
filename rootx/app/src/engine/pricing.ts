import type { PricingConfig, PriceQuote, PriceLine, Stop, PackageInfo } from './types';
import { pathLength, unitsToKm } from './zones';
import { TRANSPORT_CAPS } from './config';

/* ============================================================================
   ROOT-X pricing engine — pure, configurable, auditable.
   ----------------------------------------------------------------------------
   ⚠ All parameters are DEMO DEFAULTS pending founder approval.
   The engine is deterministic: same inputs → same itemised quote. Production
   keeps this logic server-side only; clients receive quotes, never compute
   them. Final charge is confirmed before payment and never silently raised.
   ========================================================================== */

export interface PricingInput {
  stops: { x: number; y: number }[];
  pkg: Pick<PackageInfo, 'sizeTier' | 'weightKg' | 'fragile' | 'food' | 'declaredValue'>;
  transport: 'foot' | 'bicycle' | 'motorcycle';
  config: PricingConfig;
}

export interface PricingValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
  isHighValue: boolean;
}

export function validatePackage(pkg: PackageInfo, config: PricingConfig): PricingValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (pkg.photos.length < 1) errors.push('At least one package photograph is required.');
  if (!pkg.description.trim()) errors.push('Describe the package contents.');
  if (pkg.quantity < 1) errors.push('Quantity must be at least 1.');
  if (pkg.weightKg <= 0) errors.push('Enter the declared weight.');
  if (pkg.weightKg > 30) errors.push('Declared weight exceeds the platform maximum (30 kg). Split the shipment or contact support.');
  const liters = (pkg.dimensions.l * pkg.dimensions.w * pkg.dimensions.h) / 1000;
  if (liters <= 0) errors.push('Enter package dimensions.');
  if (liters > 90) errors.push('Package volume exceeds the largest supported tier (90 L).');
  if (!pkg.contentsDeclared) errors.push('You must declare that the contents are legal and permitted.');
  const isHighValue = (pkg.declaredValue ?? 0) >= config.highValueThreshold;
  if ((pkg.declaredValue ?? 0) > config.maxDeclaredValue) {
    errors.push(
      `Declared value exceeds the current limit (₦${config.maxDeclaredValue.toLocaleString()}). High-value coverage terms are pending — split the shipment or contact support.`,
    );
  }
  if (isHighValue) {
    warnings.push(
      'High-value item: extra verification applies and only highly-rated riders are eligible. ROOT-X does not offer insurance unless verified coverage is confirmed in writing.',
    );
  }
  if (pkg.fragile) warnings.push('Fragile: only riders qualified for fragile handling will be matched.');
  if (pkg.food) warnings.push('Food: sealed packaging is required; delivery timing will account for pickup readiness.');
  return { ok: errors.length === 0, errors, warnings, isHighValue };
}

/** Straight-line route distance over the schematic map (production uses a
 *  routing engine with campus gate/path knowledge — see docs/11-mapping.md). */
export function routeDistanceKm(stops: { x: number; y: number }[]): number {
  if (stops.length < 2) return 0;
  return Math.round(unitsToKm(pathLength(stops)) * 10) / 10;
}

export function estimateEtaMinutes(distanceKm: number, stops: Stop[], pkg: PackageInfo, transport: string): number {
  const speed = TRANSPORT_CAPS[transport]?.speedKmh ?? 12;
  const travel = (distanceKm / speed) * 60;
  const perStop = 6; // handover overhead per stop (min) — DEMO
  const handling = (pkg.fragile ? 4 : 0) + (pkg.food ? 5 : 0);
  return Math.max(10, Math.round(travel + perStop * Math.max(1, stops.length - 1) + handling));
}

export function quote(input: PricingInput): PriceQuote {
  const { config, pkg, transport } = input;
  const lines: PriceLine[] = [];
  const distanceKm = routeDistanceKm(input.stops);
  const extraStops = Math.max(0, input.stops.length - 2);

  lines.push({ key: 'base', label: 'Base fare', amount: config.baseFare });

  const billableKm = Math.max(0, Math.ceil((distanceKm - config.includedKm) * 2) / 2);
  if (billableKm > 0) {
    lines.push({
      key: 'distance',
      label: `Distance (${billableKm.toFixed(1)} km beyond ${config.includedKm} km included)`,
      amount: Math.round(billableKm * config.perKm),
    });
  }

  const tierFee = config.sizeTierFees[pkg.sizeTier] ?? 0;
  if (tierFee > 0) lines.push({ key: 'size', label: `Package size — ${pkg.sizeTier}`, amount: tierFee });

  const extraKg = Math.max(0, Math.ceil(pkg.weightKg - config.includedWeightKg));
  if (extraKg > 0) {
    lines.push({ key: 'weight', label: `Weight (${extraKg} kg beyond ${config.includedWeightKg} kg included)`, amount: extraKg * config.perExtraKg });
  }

  if (pkg.fragile) lines.push({ key: 'fragile', label: 'Fragile handling', amount: config.fragileFee });
  if (pkg.food) lines.push({ key: 'food', label: 'Sealed food handling', amount: config.foodSealedFee });

  const isHighValue = (pkg.declaredValue ?? 0) >= config.highValueThreshold;
  if (isHighValue && pkg.declaredValue) {
    const pctFee = Math.min(config.highValueFeeCap, Math.round((pkg.declaredValue * config.highValuePct) / 100));
    lines.push({ key: 'highvalue', label: `High-value handling (${config.highValuePct}% of declared value, capped)`, amount: pctFee });
  }

  if (extraStops > 0) {
    lines.push({ key: 'stops', label: `Extra stop${extraStops > 1 ? 's' : ''} (${extraStops})`, amount: extraStops * config.extraStopFee });
  }

  const sum = lines.reduce((a, l) => a + l.amount, 0);
  const total = Math.max(config.minFare, sum);

  return {
    lines,
    total,
    distanceKm,
    etaMinutes: estimateEtaMinutes(distanceKm, input.stops as unknown as Stop[], pkg as PackageInfo, transport),
    currency: 'NGN',
  };
}

/** Split a charge into the auditable financial record. */
export function splitLedger(
  charge: number,
  config: PricingConfig,
  adjustments: { label: string; amount: number }[] = [],
): { gatewayFee: number; commission: number; riderNet: number } {
  const gatewayFee = Math.round(config.gatewayFeeFixed + (charge * config.gatewayFeePct) / 100);
  const commission = Math.round((charge * config.commissionPct) / 100);
  const adjSum = adjustments.reduce((a, x) => a + x.amount, 0);
  const riderNet = charge - gatewayFee - commission - adjSum;
  return { gatewayFee, commission, riderNet };
}
