import type { Delivery, RiderProfile, Policies, PricingConfig } from './types';
import { dist } from './zones';

/* ============================================================================
   ROOT-X rider matching engine.
   ----------------------------------------------------------------------------
   Deterministic filter + score. Prevents duplicate/conflicting assignment via
   the offer ledger (store enforces single acceptance). Capacity, special
   handling, zone, availability and safety-hours all gate eligibility.
   ========================================================================== */

export interface MatchCandidate {
  rider: RiderProfile;
  score: number;
  distanceUnits: number;
  reasons: string[]; // why this rider is suitable (shown to ops)
}

const TRANSPORT_RANK: Record<string, number> = { foot: 0, bicycle: 1, motorcycle: 2 };

export function eligibleRiders(
  delivery: Delivery,
  riders: RiderProfile[],
  policies: Policies,
): { eligible: MatchCandidate[]; rejected: { rider: RiderProfile; reason: string }[] } {
  const pickup = delivery.stops[0];
  const pkg = delivery.package;
  const eligible: MatchCandidate[] = [];
  const rejected: { rider: RiderProfile; reason: string }[] = [];

  // Note: rider profiles only exist for APPROVED applications — the store
  // enforces this invariant (applications gate profile creation), so no
  // unapproved applicant can ever appear as an eligible rider.
  for (const r of riders) {
    if (r.zoneId !== pickup.zoneId) {
      rejected.push({ rider: r, reason: 'Outside pickup zone' });
      continue;
    }
    if (!r.isAvailable) {
      rejected.push({ rider: r, reason: 'Currently unavailable' });
      continue;
    }
    if (pkg.weightKg > r.capacityKg) {
      rejected.push({ rider: r, reason: `Weight ${pkg.weightKg} kg exceeds capacity ${r.capacityKg} kg` });
      continue;
    }
    if (pkg.fragile && TRANSPORT_RANK[r.transport] < TRANSPORT_RANK[policies.fragileTransportFloor]) {
      rejected.push({ rider: r, reason: 'Not qualified for fragile handling' });
      continue;
    }
    const isHighValue = (pkg.declaredValue ?? 0) >= 50000;
    if (isHighValue && (r.rating < policies.highValueMinRating || r.completed < policies.highValueMinCompleted)) {
      rejected.push({ rider: r, reason: 'High-value delivery requires a higher reliability record' });
      continue;
    }
    if (r.location == null) {
      rejected.push({ rider: r, reason: 'No current location (stale GPS)' });
      continue;
    }
    const d = dist(pickup, r.location);
    // Proximity gate: within ~1.5 km of pickup for offers
    if (d > 150) {
      rejected.push({ rider: r, reason: 'Too far from pickup' });
      continue;
    }
    const reasons: string[] = [];
    if (d < 50) reasons.push('Very close to pickup');
    else reasons.push('Within offer radius');
    if (r.rating >= 4.6) reasons.push('Highly rated');
    if (r.onTimeRate >= 0.95) reasons.push('Consistently on time');
    if (TRANSPORT_RANK[r.transport] > TRANSPORT_RANK.foot && pkg.sizeTier === 'xlarge') reasons.push('Capacity for bulky items');

    // score: proximity (60%) + rating (25%) + punctuality (15%)
    const proximityScore = Math.max(0, 1 - d / 150);
    const ratingScore = (r.rating - 3.5) / 1.5;
    const punctuality = r.onTimeRate;
    const score = 0.6 * proximityScore + 0.25 * Math.max(0, ratingScore) + 0.15 * punctuality;

    eligible.push({ rider: r, score: Math.round(score * 1000) / 1000, distanceUnits: d, reasons });
  }

  eligible.sort((a, b) => b.score - a.score);
  return { eligible, rejected };
}

/** Offer window: 90 s round 1, 60 s subsequent rounds (DEMO compresses this). */
export function offerExpiry(createdAt: number, round: number): number {
  return createdAt + (round === 1 ? 90 : 60) * 1000;
}

/** Commission preview for the rider app (transparency by design). */
export function riderEarningsPreview(total: number, config: PricingConfig): number {
  return total - Math.round(config.gatewayFeeFixed + (total * config.gatewayFeePct) / 100) - Math.round((total * config.commissionPct) / 100);
}
