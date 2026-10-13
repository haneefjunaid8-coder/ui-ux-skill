import type { AppConfig, PricingConfig, ServiceHoursConfig, Policies } from './types';

/* ============================================================================
   ROOT-X configurable defaults.
   ----------------------------------------------------------------------------
   ⚠ DEMO DEFAULTS — NOT FINAL BUSINESS POLICY.
   Every value below is a documented placeholder chosen to make the product
   testable. Fares, commission, fees and thresholds must be set by the founder
   after operational analysis. See docs/19-assumptions-risks-decisions.md.
   ========================================================================== */

export const PRICING_DEFAULTS: PricingConfig = {
  currency: 'NGN',
  baseFare: 600,
  perKm: 140,
  includedKm: 1.5,
  sizeTierFees: { small: 0, medium: 200, large: 500, xlarge: 900 },
  includedWeightKg: 5,
  perExtraKg: 60,
  fragileFee: 250,
  foodSealedFee: 150,
  highValuePct: 2, // % of declared value
  highValueFeeCap: 1500,
  highValueThreshold: 50000,
  maxDeclaredValue: 150000,
  extraStopFee: 300,
  minFare: 700,
  commissionPct: 15, // ← UNRESOLVED: final commission % requires founder approval
  gatewayFeeFixed: 100,
  gatewayFeePct: 1.5,
};

export const HOURS_DEFAULTS: ServiceHoursConfig = {
  openHour: 8,
  warningHour: 18, // 6 PM warning
  closeHour: 21, // 9 PM closure
  bookingCutoffBufferMin: 45,
  handlingBufferMin: 15,
  activeGraceMin: 60,
  cancellationFeeStages: [
    { label: 'Before a rider is assigned', beforeStatus: ['awaiting_payment', 'awaiting_rider', 'offered_to_riders'], fee: 0, refundRider: false },
    { label: 'Rider assigned, not yet at pickup', beforeStatus: ['rider_assigned', 'rider_approaching_pickup'], fee: 200, refundRider: false },
    { label: 'Rider at pickup / verifying', beforeStatus: ['at_pickup', 'pickup_verification_pending'], fee: 400, refundRider: true },
    { label: 'Package collected or in transit', beforeStatus: ['package_collected', 'in_transit', 'approaching_destination', 'delivery_verification_pending'], fee: 700, refundRider: true },
  ],
};

export const POLICIES_DEFAULTS: Policies = {
  interZonePolicy: 'intra_zone_only', // inter-campus disabled pending approval
  fragileTransportFloor: 'bicycle',
  highValueMinRating: 4.5,
  highValueMinCompleted: 20,
  otpLockoutAttempts: 5,
  otpLockoutMinutes: 10,
  failedDeliveryWaitMin: 10,
  payoutMinAmount: 2000,
  guestTokenHours: 48,
};

export const CONFIG_DEFAULTS: AppConfig = {
  pricing: PRICING_DEFAULTS,
  hours: HOURS_DEFAULTS,
  policies: POLICIES_DEFAULTS,
  zonesActive: {},
  version: 1,
  updatedAt: 0,
};

/** Transport capacities — DEMO defaults; vehicle documents required per method. */
export const TRANSPORT_CAPS: Record<string, { kg: number; liters: number; label: string; speedKmh: number }> = {
  foot: { kg: 5, liters: 20, label: 'On foot', speedKmh: 5 },
  bicycle: { kg: 12, liters: 40, label: 'Bicycle', speedKmh: 12 },
  motorcycle: { kg: 25, liters: 90, label: 'Motorcycle', speedKmh: 22 },
};

/** Size tier from dimensions (cm) — volume in litres. */
export function sizeTierFromDims(dims: { l: number; w: number; h: number }) {
  const liters = (dims.l * dims.w * dims.h) / 1000;
  if (liters <= 15) return 'small' as const;
  if (liters <= 35) return 'medium' as const;
  if (liters <= 60) return 'large' as const;
  return 'xlarge' as const;
}

export const CATEGORY_LABELS: Record<string, string> = {
  documents: 'Documents & stationery',
  books: 'Books',
  food: 'Food & snacks',
  groceries: 'Groceries',
  clothing: 'Clothing & personal items',
  electronics: 'Electronics',
  pharmacy: 'Pharmacy & personal care',
  business_stock: 'Business stock / parcels',
  other: 'Other (reviewed)',
};

/**
 * Prohibited items — configurable policy. Enforced by sender declaration,
 * rider right-of-refusal at pickup, reporting and account action.
 * Source of truth in production: admin-managed policy table + legal review.
 */
export const PROHIBITED_ITEMS = [
  'Illegal drugs and controlled substances',
  'Weapons, ammunition and explosives',
  'Hazardous or flammable chemicals',
  'Live animals',
  'Alcohol and tobacco (payment-provider restrictions)',
  'Large amounts of cash',
  'Stolen or counterfeit goods',
  'Items violating university rules',
];
