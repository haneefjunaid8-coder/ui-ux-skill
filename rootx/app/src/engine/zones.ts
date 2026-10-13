import type { Zone, Landmark } from './types';

/* ============================================================================
   ROOT-X service zones — SCHEMATIC DEMO GEOMETRY.
   ----------------------------------------------------------------------------
   ⚠ These are illustrative placeholders for the prototype, NOT approved
   service boundaries. Coordinates use schematic map units (1 unit = 100 m)
   around approximate campus locations. Before launch, each polygon must be
   surveyed, validated against GPS traces, and approved by the founder (and
   the university where required). See docs/11-mapping.md and
   docs/19-assumptions-risks-decisions.md.

   UNIOSUN operates multiple campuses (Osogbo, Ikire, Ifetedo, Ipetu-Ijesa,
   Ejigbo, Okuku). Inter-campus delivery is DISABLED by default
   (policies.interZonePolicy = 'intra_zone_only') pending approval.
   The prototype map models the Osogbo campus + adjacent township in detail.
   ========================================================================== */

function lm(id: string, name: string, x: number, y: number, kind: Landmark['kind']): Landmark {
  return { id, name, x, y, kind };
}

export const OSOGBO_CAMPUS: Zone = {
  id: 'osogbo-campus',
  campus: 'Osogbo (Main)',
  name: 'Osogbo Campus',
  kind: 'campus',
  active: true,
  polygon: [
    { x: 120, y: 140 },
    { x: 200, y: 100 },
    { x: 300, y: 90 },
    { x: 390, y: 120 },
    { x: 420, y: 200 },
    { x: 400, y: 280 },
    { x: 310, y: 320 },
    { x: 200, y: 330 },
    { x: 130, y: 290 },
    { x: 105, y: 210 },
  ],
  landmarks: [
    lm('lm-main-gate', 'Main Gate', 150, 300, 'gate'),
    lm('lm-library', 'University Library', 230, 180, 'academic'),
    lm('lm-sciences', 'Faculty of Sciences', 320, 150, 'academic'),
    lm('lm-humanities', 'Humanities Block', 180, 220, 'academic'),
    lm('lm-lecture-valley', 'Lecture Theatre Valley', 270, 235, 'academic'),
    lm('lm-union', 'Student Union Building', 240, 285, 'commercial'),
    lm('lm-hostel-a', 'Hostel Block A', 350, 240, 'hostel'),
    lm('lm-hostel-b', 'Hostel Block B', 365, 190, 'hostel'),
    lm('lm-sports', 'Sports Complex', 160, 160, 'transport'),
    lm('lm-health', 'Health Centre', 300, 285, 'health'),
    lm('lm-bookshop', 'Campus Bookshop', 255, 210, 'commercial'),
    lm('lm-bursary', 'Bursary / Admin', 200, 150, 'academic'),
  ],
  restricted: [
    { x: 300, y: 100, w: 70, h: 45, label: 'Staff Quarters — restricted' },
  ],
  hours: { open: 8, close: 21 },
};

export const OKE_BAAALE: Zone = {
  id: 'oke-baale',
  campus: 'Osogbo (Main)',
  name: 'Oke-Baale Student Township',
  kind: 'township',
  active: true,
  polygon: [
    { x: 130, y: 360 },
    { x: 240, y: 345 },
    { x: 350, y: 355 },
    { x: 430, y: 380 },
    { x: 445, y: 450 },
    { x: 360, y: 490 },
    { x: 230, y: 495 },
    { x: 140, y: 465 },
    { x: 110, y: 410 },
  ],
  landmarks: [
    lm('lm-market', 'Oke-Baale Market', 250, 420, 'commercial'),
    lm('lm-unity-park', 'Unity Bus Stop', 340, 390, 'transport'),
    lm('lm-student-village', 'Student Village Hostels', 200, 450, 'hostel'),
    lm('lm-pharmacy', 'Community Pharmacy', 300, 460, 'health'),
    lm('lm-eateries', 'Campus Road Eateries', 170, 390, 'commercial'),
  ],
  restricted: [],
  hours: { open: 8, close: 21 },
};

export const OSOGBO_GROUP = [OSOGBO_CAMPUS, OKE_BAAALE];

/** Other campuses — present in the zone directory; detailed geometry pending survey. */
export const OTHER_CAMPUSES: Zone[] = [
  {
    id: 'ikire-campus',
    campus: 'Ikire',
    name: 'Ikire Campus',
    kind: 'campus',
    active: true,
    polygon: [
      { x: 150, y: 150 },
      { x: 320, y: 130 },
      { x: 360, y: 260 },
      { x: 300, y: 330 },
      { x: 160, y: 320 },
      { x: 120, y: 230 },
    ],
    landmarks: [
      lm('ik-gate', 'Campus Gate', 180, 300, 'gate'),
      lm('ik-lib', 'Library', 240, 200, 'academic'),
      lm('ik-hostels', 'Hostels', 300, 260, 'hostel'),
    ],
    restricted: [],
    hours: { open: 8, close: 21 },
  },
  {
    id: 'ifetedo-campus',
    campus: 'Ifetedo',
    name: 'Ifetedo Campus',
    kind: 'campus',
    active: true,
    polygon: [
      { x: 150, y: 150 },
      { x: 320, y: 130 },
      { x: 360, y: 260 },
      { x: 300, y: 330 },
      { x: 160, y: 320 },
      { x: 120, y: 230 },
    ],
    landmarks: [
      lm('if-gate', 'Campus Gate', 200, 300, 'gate'),
      lm('if-science', 'Science Complex', 250, 210, 'academic'),
    ],
    restricted: [],
    hours: { open: 8, close: 21 },
  },
  {
    id: 'ipetu-campus',
    campus: 'Ipetu-Ijesa',
    name: 'Ipetu-Ijesa Campus',
    kind: 'campus',
    active: true,
    polygon: [
      { x: 150, y: 150 },
      { x: 320, y: 130 },
      { x: 360, y: 260 },
      { x: 300, y: 330 },
      { x: 160, y: 320 },
      { x: 120, y: 230 },
    ],
    landmarks: [lm('ip-gate', 'Campus Gate', 190, 290, 'gate')],
    restricted: [],
    hours: { open: 8, close: 21 },
  },
  {
    id: 'ejigbo-campus',
    campus: 'Ejigbo',
    name: 'Ejigbo Campus',
    kind: 'campus',
    active: true,
    polygon: [
      { x: 150, y: 150 },
      { x: 320, y: 130 },
      { x: 360, y: 260 },
      { x: 300, y: 330 },
      { x: 160, y: 320 },
      { x: 120, y: 230 },
    ],
    landmarks: [lm('ej-gate', 'Campus Gate', 200, 290, 'gate')],
    restricted: [],
    hours: { open: 8, close: 21 },
  },
  {
    id: 'okuku-campus',
    campus: 'Okuku',
    name: 'Okuku Campus',
    kind: 'campus',
    active: false, // suspended — example of admin zone control
    polygon: [
      { x: 150, y: 150 },
      { x: 320, y: 130 },
      { x: 360, y: 260 },
      { x: 300, y: 330 },
      { x: 160, y: 320 },
      { x: 120, y: 230 },
    ],
    landmarks: [lm('ok-gate', 'Campus Gate', 200, 290, 'gate')],
    restricted: [],
    hours: { open: 8, close: 20 },
  },
];

export const ALL_ZONES: Zone[] = [...OSOGBO_GROUP, ...OTHER_CAMPUSES];

/** Zones that share a campus group (allowed pairs under 'same_campus'). */
export function zoneGroup(zoneId: string): string {
  const z = ALL_ZONES.find((z) => z.id === zoneId);
  return z ? z.campus : zoneId;
}

/* ---- geometry helpers (schematic) ---------------------------------------- */

/** Ray-casting point-in-polygon. Production uses PostGIS ST_Contains with
 *  buffered boundaries to tolerate GPS error (see docs/11-mapping.md). */
export function pointInPolygon(pt: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x,
      yi = polygon[i].y,
      xj = polygon[j].x,
      yj = polygon[j].y;
    const intersect = yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** GPS tolerance in map units (±30 m) for boundary edge cases. */
export const GPS_TOLERANCE_UNITS = 3;

export function pointNearPolygon(pt: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean {
  return pointInPolygon(pt, polygon) || polygon.some((p) => dist(pt, p) <= GPS_TOLERANCE_UNITS);
}

export function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Distance in schematic units → km (1 unit = 10 m). */
export function unitsToKm(units: number): number {
  return units * 0.01;
}

/** Polyline length. */
export function pathLength(points: { x: number; y: number }[]): number {
  let d = 0;
  for (let i = 1; i < points.length; i++) d += dist(points[i - 1], points[i]);
  return d;
}

export function zoneOfPoint(pt: { x: number; y: number }, zones: Zone[]): Zone | undefined {
  return zones.find((z) => z.active && pointInPolygon(pt, z.polygon));
}

/** Nearest landmark within a radius, for address validation. */
export function nearestLandmark(pt: { x: number; y: number }, zone: Zone, radius = 12): Landmark | undefined {
  const cands = zone.landmarks
    .map((l) => ({ l, d: dist(pt, l) }))
    .filter((c) => c.d <= radius)
    .sort((a, b) => a.d - b.d);
  return cands[0]?.l;
}

export interface ZoneEligibilityResult {
  eligible: boolean;
  reason?: string;
  needsExceptionReview?: boolean;
  pickupZone?: Zone;
  dropoffZones: Zone[];
}

/** Validate pickup + all dropoffs against active zones and inter-zone policy. */
export function checkZoneEligibility(
  pickup: { x: number; y: number },
  dropoffs: { x: number; y: number }[],
  zones: Zone[],
  policy: 'intra_zone_only' | 'same_campus' | 'any_active_zone',
): ZoneEligibilityResult {
  const pickupZone = zones.find((z) => z.active && pointNearPolygon(pickup, z.polygon));
  if (!pickupZone) {
    // within tolerance of a suspended zone → exception review path
    const nearInactive = zones.find((z) => !z.active && pointNearPolygon(pickup, z.polygon));
    return {
      eligible: false,
      reason: nearInactive
        ? `${nearInactive.name} is currently outside the active service area. You can request an exception review.`
        : 'Pickup location is outside the approved UNIOSUN service area.',
      needsExceptionReview: true,
      dropoffZones: [],
    };
  }
  const dropoffZones: Zone[] = [];
  for (const d of dropoffs) {
    const z = zones.find((z) => z.active && pointNearPolygon(d, z.polygon));
    if (!z) {
      return {
        eligible: false,
        reason: 'A destination is outside the approved UNIOSUN service area.',
        needsExceptionReview: true,
        pickupZone,
        dropoffZones,
      };
    }
    dropoffZones.push(z);
  }
  if (policy === 'intra_zone_only') {
    const bad = dropoffZones.find((z) => z.id !== pickupZone.id);
    if (bad) {
      return {
        eligible: false,
        reason: `Inter-zone delivery (${pickupZone.name} → ${bad.name}) is not enabled yet. Inter-campus service is pending approval.`,
        needsExceptionReview: true,
        pickupZone,
        dropoffZones,
      };
    }
  } else if (policy === 'same_campus') {
    const bad = dropoffZones.find((z) => zoneGroup(z.id) !== zoneGroup(pickupZone.id));
    if (bad) {
      return {
        eligible: false,
        reason: `Inter-campus delivery (${pickupZone.campus} → ${bad.campus}) is disabled.`,
        needsExceptionReview: true,
        pickupZone,
        dropoffZones,
      };
    }
  }
  return { eligible: true, pickupZone, dropoffZones };
}
