import { describe, expect, it } from 'vitest';
import { checkZoneEligibility, pointInPolygon, zoneOfPoint, ALL_ZONES, unitsToKm, dist } from './zones';
import { OSOGBO_CAMPUS, OKE_BAAALE } from './zones';

describe('zone eligibility & geofencing', () => {
  it('contains points inside the campus polygon', () => {
    expect(pointInPolygon({ x: 250, y: 200 }, OSOGBO_CAMPUS.polygon)).toBe(true);
    expect(zoneOfPoint({ x: 250, y: 200 }, ALL_ZONES)?.id).toBe('osogbo-campus');
  });

  it('rejects points outside every zone', () => {
    expect(zoneOfPoint({ x: 20, y: 520 }, ALL_ZONES)).toBeUndefined();
  });

  it('allows intra-zone campus → township is blocked by default policy', () => {
    const insideCampus = { x: 250, y: 200 };
    const insideTownship = { x: 250, y: 430 };
    // sanity: the two zones really are different zones
    expect(zoneOfPoint(insideCampus, ALL_ZONES)?.id).toBe('osogbo-campus');
    expect(zoneOfPoint(insideTownship, ALL_ZONES)?.id).toBe('oke-baale');

    const intra = checkZoneEligibility(insideCampus, [insideTownship], ALL_ZONES, 'intra_zone_only');
    expect(intra.eligible).toBe(false);
    expect(intra.reason).toContain('Inter-zone');

    const sameCampus = checkZoneEligibility(insideCampus, [insideTownship], ALL_ZONES, 'same_campus');
    expect(sameCampus.eligible).toBe(true); // campus + its township share a campus group
  });

  it('allows deliveries within one zone', () => {
    const a = { x: 230, y: 180 };
    const b = { x: 340, y: 250 };
    const r = checkZoneEligibility(a, [b], ALL_ZONES, 'intra_zone_only');
    expect(r.eligible).toBe(true);
    expect(r.pickupZone?.id).toBe('osogbo-campus');
  });

  it('routes ineligible pickups to exception review, not a dead end', () => {
    const r = checkZoneEligibility({ x: 20, y: 520 }, [{ x: 250, y: 200 }], ALL_ZONES, 'intra_zone_only');
    expect(r.eligible).toBe(false);
    expect(r.needsExceptionReview).toBe(true);
  });

  it('flags suspended zones via the exception path', () => {
    const okuku = ALL_ZONES.find((z) => z.id === 'okuku-campus')!;
    const inside = { x: 240, y: 230 };
    expect(zoneOfPoint(inside, [okuku])).toBeUndefined(); // not active
    const r = checkZoneEligibility(inside, [inside], [okuku], 'intra_zone_only');
    expect(r.needsExceptionReview).toBe(true);
    expect(r.reason).toContain('outside the active service area');
  });

  it('converts schematic units to kilometres (1 unit = 10 m)', () => {
    expect(unitsToKm(100)).toBe(1);
    expect(dist({ x: 0, y: 0 }, { x: 100, y: 0 })).toBe(100);
  });

  it('township zone exists and is active', () => {
    expect(OKE_BAAALE.active).toBe(true);
    expect(OKE_BAAALE.kind).toBe('township');
  });
});
