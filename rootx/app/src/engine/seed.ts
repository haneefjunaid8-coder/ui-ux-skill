import type {
  UserAccount,
  RiderProfile,
  RiderApplication,
  Delivery,
  Dispute,
  Incident,
  Notification,
  AuditEntry,
  Payout,
  AppConfig,
  RecurrencePlan,
} from './types';
import { CONFIG_DEFAULTS } from './config';
import { OSOGBO_CAMPUS, OKE_BAAALE, ALL_ZONES } from './zones';
import { quote } from './pricing';
import { buildLedger } from './ledger';

/* ============================================================================
   DEMO SEED — entirely fictional data for the prototype. No real persons.
   ========================================================================== */

/** Placeholder "photo" as an inline SVG data URL (no network needed). */
export function svgPhoto(label: string, color: string, sub = ''): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='220'>
  <rect width='320' height='220' rx='14' fill='${color}'/>
  <rect x='14' y='14' width='292' height='192' rx='8' fill='none' stroke='rgba(255,255,255,0.55)' stroke-width='2' stroke-dasharray='6 6'/>
  <text x='160' y='108' font-family='sans-serif' font-size='17' font-weight='700' fill='white' text-anchor='middle'>${label}</text>
  <text x='160' y='132' font-family='sans-serif' font-size='11' fill='rgba(255,255,255,0.85)' text-anchor='middle'>${sub || 'package photo — demo'}</text>
</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function lm(zoneId: string, id: string) {
  const z = ALL_ZONES.find((z) => z.id === zoneId);
  const l = z?.landmarks.find((l) => l.id === id);
  return { x: l!.x, y: l!.y, label: l!.name, landmarkId: id, zoneId };
}

const DAY = 86_400_000;

export interface SeedResult {
  users: UserAccount[];
  riders: RiderProfile[];
  applications: RiderApplication[];
  deliveries: Delivery[];
  recurring: RecurrencePlan[];
  disputes: Dispute[];
  incidents: Incident[];
  notifications: Notification[];
  auditLog: AuditEntry[];
  payouts: Payout[];
  config: AppConfig;
  epoch: number;
}

export function buildSeed(now: number): SeedResult {
  const today13 = new Date(now).setHours(13, 5, 0, 0);
  const yesterday = today13 - DAY;
  const threeDaysAgo = today13 - 3 * DAY;
  const tomorrow = today13 + DAY;

  const users: UserAccount[] = [
    {
      id: 'u-ada',
      name: 'Ada Obi',
      phone: '0803 111 0001',
      role: 'customer',
      zoneId: 'osogbo-campus',
      walletBalance: 12500,
      createdAt: threeDaysAgo - 10 * DAY,
      savedLocations: [
        { id: 'sl-1', ...lm('osogbo-campus', 'lm-hostel-a'), label: 'My hostel — Block A' },
        { id: 'sl-2', ...lm('osogbo-campus', 'lm-library'), label: 'Library reading room' },
        { id: 'sl-3', ...lm('oke-baale', 'lm-market'), label: 'Oke-Baale Market' },
      ],
      notifyPrefs: { push: true, sms: true, email: false },
    },
    {
      id: 'u-tunde',
      name: 'Tunde Bakare',
      phone: '0803 111 0002',
      role: 'customer',
      zoneId: 'oke-baale',
      walletBalance: 3200,
      createdAt: threeDaysAgo - 5 * DAY,
      savedLocations: [{ id: 'sl-4', ...lm('oke-baale', 'lm-student-village'), label: 'Home — Student Village' }],
      notifyPrefs: { push: true, sms: true, email: false },
    },
    {
      id: 'u-chidi',
      name: 'Chidi Okafor',
      phone: '0803 222 0001',
      role: 'rider',
      zoneId: 'osogbo-campus',
      walletBalance: 0,
      createdAt: threeDaysAgo - 40 * DAY,
      savedLocations: [],
      notifyPrefs: { push: true, sms: true, email: false },
    },
    {
      id: 'u-amaka',
      name: 'Amaka Eze',
      phone: '0803 333 0001',
      role: 'customer',
      zoneId: 'osogbo-campus',
      walletBalance: 800,
      createdAt: today13 - 2 * DAY,
      savedLocations: [],
      notifyPrefs: { push: true, sms: true, email: false },
    },
    {
      id: 'u-admin',
      name: 'Mrs. Bello (Ops)',
      phone: '0803 999 0001',
      role: 'admin',
      zoneId: 'osogbo-campus',
      walletBalance: 0,
      createdAt: threeDaysAgo - 90 * DAY,
      savedLocations: [],
      notifyPrefs: { push: true, sms: true, email: true },
    },
    {
      id: 'u-finance',
      name: 'Mr. Adeyemi (Finance)',
      phone: '0803 999 0002',
      role: 'finance',
      zoneId: 'osogbo-campus',
      walletBalance: 0,
      createdAt: threeDaysAgo - 90 * DAY,
      savedLocations: [],
      notifyPrefs: { push: true, sms: true, email: true },
    },
  ];

  const riders: RiderProfile[] = [
    {
      id: 'r-chidi',
      userId: 'u-chidi',
      applicationId: 'app-1001',
      transport: 'motorcycle',
      capacityKg: 25,
      capacityLiters: 90,
      zoneId: 'osogbo-campus',
      isAvailable: true,
      simulated: false,
      workingHours: [{ start: '09:00', end: '18:30' }],
      rating: 4.7,
      completed: 132,
      onTimeRate: 0.96,
      pendingEarnings: 1850,
      availableEarnings: 6400,
      location: { x: 250, y: 250 },
      locationUpdatedAt: today13 - 60_000,
    },
    {
      id: 'r-kofi',
      userId: '',
      applicationId: 'app-9001',
      transport: 'bicycle',
      capacityKg: 12,
      capacityLiters: 40,
      zoneId: 'osogbo-campus',
      isAvailable: true,
      simulated: true,
      workingHours: [{ start: '08:00', end: '18:00' }],
      rating: 4.4,
      completed: 51,
      onTimeRate: 0.92,
      pendingEarnings: 420,
      availableEarnings: 2100,
      location: { x: 300, y: 400 },
      locationUpdatedAt: today13 - 30_000,
    },
    {
      id: 'r-ibrahim',
      userId: '',
      applicationId: 'app-9002',
      transport: 'foot',
      capacityKg: 5,
      capacityLiters: 20,
      zoneId: 'osogbo-campus',
      isAvailable: true,
      simulated: true,
      workingHours: [{ start: '10:00', end: '17:00' }],
      rating: 4.2,
      completed: 22,
      onTimeRate: 0.89,
      pendingEarnings: 90,
      availableEarnings: 640,
      location: { x: 245, y: 290 },
      locationUpdatedAt: today13 - 45_000,
    },
    {
      id: 'r-blessing',
      userId: '',
      applicationId: 'app-9003',
      transport: 'motorcycle',
      capacityKg: 25,
      capacityLiters: 90,
      zoneId: 'osogbo-campus',
      isAvailable: true,
      simulated: true,
      workingHours: [{ start: '08:00', end: '20:00' }],
      rating: 4.8,
      completed: 210,
      onTimeRate: 0.97,
      pendingEarnings: 760,
      availableEarnings: 9800,
      location: { x: 360, y: 200 },
      locationUpdatedAt: today13 - 20_000,
    },
  ];

  const applications: RiderApplication[] = [
    {
      id: 'app-1001',
      userId: 'u-chidi',
      fullName: 'Chidi Okafor',
      matricNumber: 'UNIOSUN/SCI/2021/0142',
      studentIdDoc: svgPhoto('STUDENT ID — CHIDI OKAFOR', '#1d5c46', 'verified document (demo)'),
      phone: '0803 222 0001',
      emergencyContact: { name: 'Ndidi Okafor', phone: '0803 222 0099', relationship: 'Sister' },
      transport: 'motorcycle',
      zoneId: 'osogbo-campus',
      status: 'approved',
      submittedAt: threeDaysAgo - 41 * DAY,
      reviewNotes: [{ at: threeDaysAgo - 40 * DAY, by: 'Mrs. Bello (Ops)', note: 'Matric number verified against records. ID document legible. Approved.', decision: 'approved' }],
      termsAcceptedAt: threeDaysAgo - 41 * DAY,
    },
    {
      id: 'app-1002',
      userId: 'u-amaka',
      fullName: 'Amaka Eze',
      matricNumber: 'UNIOSUN/HUM/2023/0876',
      studentIdDoc: svgPhoto('STUDENT ID — AMAKA EZE', '#4a5568', 'awaiting review (demo)'),
      phone: '0803 333 0001',
      emergencyContact: { name: 'Chidi Eze', phone: '0803 333 0099', relationship: 'Brother' },
      transport: 'bicycle',
      zoneId: 'osogbo-campus',
      status: 'under_review',
      submittedAt: today13 - 2 * DAY,
      reviewNotes: [],
      termsAcceptedAt: today13 - 2 * DAY,
    },
  ];

  /* ---- deliveries -------------------------------------------------------- */

  function baseDelivery(partial: Partial<Delivery> & Pick<Delivery, 'id' | 'ref' | 'customerId' | 'stops' | 'package' | 'status'>): Delivery {
    const distanceKm = Math.round(
      0.01 *
        partial.stops.slice(1).reduce((acc, s, i) => acc + Math.hypot(s.x - partial.stops[i].x, s.y - partial.stops[i].y), 0) *
        10,
    ) / 10;
    const q = quote({
      stops: partial.stops,
      pkg: partial.package,
      transport: 'motorcycle',
      config: CONFIG_DEFAULTS.pricing,
    });
    return {
      createdAt: today13 - 2 * 3600_000,
      kind: 'immediate',
      scheduledFor: null,
      recurrenceId: null,
      statusHistory: [{ status: partial.status, at: today13 - 3600_000 }],
      riderId: null,
      offer: null,
      quote: q,
      payment: null,
      ledger: null,
      trackingToken: { token: 'tk-' + partial.id + '-' + Math.random().toString(36).slice(2, 10), expiresAt: today13 + 48 * 3600_000, revoked: false },
      pickupCode: '4821',
      deliveryCode: '7316',
      verification: { pickupAttempts: 0, deliveryAttempts: 0, pickupLockedUntil: null, deliveryLockedUntil: null, pickupVerifiedAt: null, deliveryVerifiedAt: null },
      route: { points: partial.stops.map((s) => ({ x: s.x, y: s.y })), distanceKm: q.distanceKm, etaMinutes: q.etaMinutes },
      riderProgress: 0,
      riderLocation: null,
      cancelReason: null,
      cancelledAt: null,
      cancelledBy: null,
      disputeId: null,
      safetyFlags: [],
      rating: null,
      ...partial,
    } as Delivery;
  }

  const d101 = baseDelivery({
    id: 'd-101',
    ref: 'RX-0101',
    customerId: 'u-ada',
    stops: [
      { id: 's-1', kind: 'pickup', ...lm('osogbo-campus', 'lm-library'), receiver: undefined },
      { id: 's-2', kind: 'dropoff', ...lm('oke-baale', 'lm-student-village'), receiver: { name: 'Ada Obi', phone: '0803 111 0001' } },
    ],
    package: {
      description: 'Printed project chapters + receipt book',
      category: 'documents',
      quantity: 1,
      weightKg: 1.2,
      dimensions: { l: 32, w: 24, h: 6 },
      sizeTier: 'small',
      photos: [svgPhoto('PROJECT CHAPTERS', '#7c5cbf')],
      fragile: false,
      food: false,
      declaredValue: null,
      handlingNotes: 'Keep flat.',
      contentsDeclared: true,
    },
    status: 'delivered',
    createdAt: yesterday - 3 * 3600_000,
    riderId: 'r-chidi',
    rating: { stars: 5, tags: ['punctual', 'careful'], comment: 'Fast and careful. Thank you!', at: yesterday + 3600_000 },
  });
  d101.statusHistory = [
    { status: 'delivered', at: yesterday, note: 'Delivery code verified', actorId: 'r-chidi' },
  ];
  d101.verification = { ...d101.verification, pickupVerifiedAt: yesterday - 3600_000, deliveryVerifiedAt: yesterday };
  d101.payment = {
    id: 'pay-101',
    deliveryId: 'd-101',
    method: 'wallet',
    amount: 700,
    status: 'succeeded',
    gatewayRef: 'WAL-8812',
    idempotencyKey: 'idem-101',
    events: [{ at: yesterday - 3 * 3600_000, status: 'initiated' }, { at: yesterday - 3 * 3600_000 + 2000, status: 'succeeded' }],
  };
  const ledger101 = buildLedger(700, CONFIG_DEFAULTS.pricing);
  ledger101.deliveryId = 'd-101';
  ledger101.settlement = 'settled';
  ledger101.settledAt = yesterday + 2 * 3600_000;
  ledger101.payoutId = 'pay-out-1';
  d101.ledger = ledger101;

  // Active delivery — in transit, live tracking, guest token
  const d102 = baseDelivery({
    id: 'd-102',
    ref: 'RX-0102',
    customerId: 'u-ada',
    stops: [
      { id: 's-3', kind: 'pickup', ...lm('oke-baale', 'lm-market'), receiver: undefined },
      { id: 's-4', kind: 'dropoff', ...lm('osogbo-campus', 'lm-hostel-a'), receiver: { name: 'Tunde Bakare', phone: '0803 111 0002' } },
    ],
    package: {
      description: 'Groceries — rice, oil, provisions (2 sealed bags)',
      category: 'groceries',
      quantity: 2,
      weightKg: 9,
      dimensions: { l: 40, w: 30, h: 25 },
      sizeTier: 'medium',
      photos: [svgPhoto('GROCERY BAGS ×2', '#2f855a', 'sealed — demo')],
      fragile: true,
      food: false,
      declaredValue: null,
      handlingNotes: 'Bags sealed at pickup. Do not stack.',
      contentsDeclared: true,
    },
    status: 'in_transit',
    createdAt: today13 - 40 * 60_000,
    riderId: 'r-blessing',
  });
  d102.statusHistory = [
    { status: 'payment_processing', at: today13 - 40 * 60_000, note: 'Card payment', actorId: 'u-ada' },
    { status: 'awaiting_rider', at: today13 - 39 * 60_000, note: 'Payment succeeded', actorId: 'system' },
    { status: 'offered_to_riders', at: today13 - 39 * 60_000, note: 'Offered to 3 riders', actorId: 'system' },
    { status: 'rider_assigned', at: today13 - 37 * 60_000, note: 'Blessing accepted (4.8★)', actorId: 'r-blessing' },
    { status: 'rider_approaching_pickup', at: today13 - 35 * 60_000, actorId: 'r-blessing' },
    { status: 'at_pickup', at: today13 - 32 * 60_000, actorId: 'r-blessing' },
    { status: 'pickup_verification_pending', at: today13 - 32 * 60_000, actorId: 'r-blessing' },
    { status: 'package_collected', at: today13 - 31 * 60_000, note: 'Pickup code verified', actorId: 'r-blessing' },
    { status: 'in_transit', at: today13 - 30 * 60_000, actorId: 'r-blessing' },
  ];
  d102.verification.pickupVerifiedAt = today13 - 31 * 60_000;
  // route via Unity Bus Stop and the campus east side (campus-aware path)
  d102.route.points = [
    { x: 250, y: 420 },
    { x: 340, y: 390 },
    { x: 380, y: 330 },
    { x: 370, y: 280 },
    { x: 350, y: 240 },
  ];
  d102.riderProgress = 0.42;
  d102.riderLocation = { x: 250, y: 320, updatedAt: today13 - 8000, stale: false };
  d102.payment = {
    id: 'pay-102',
    deliveryId: 'd-102',
    method: 'card',
    amount: d102.quote.total,
    status: 'succeeded',
    gatewayRef: 'CARD-77213',
    idempotencyKey: 'idem-102',
    events: [{ at: today13 - 40 * 60_000, status: 'initiated' }, { at: today13 - 40 * 60_000 + 4000, status: 'succeeded' }],
  };
  const ledger102 = buildLedger(d102.quote.total, CONFIG_DEFAULTS.pricing);
  ledger102.deliveryId = 'd-102';
  d102.ledger = ledger102;
  d102.trackingToken = { token: 'track-demo-active', expiresAt: today13 + 24 * 3600_000, revoked: false };

  // Scheduled for tomorrow morning
  const d103 = baseDelivery({
    id: 'd-103',
    ref: 'RX-0103',
    customerId: 'u-ada',
    stops: [
      { id: 's-5', kind: 'pickup', ...lm('osogbo-campus', 'lm-bookshop') },
      { id: 's-6', kind: 'dropoff', ...lm('osogbo-campus', 'lm-hostel-b'), receiver: { name: 'Ada Obi', phone: '0803 111 0001' } },
    ],
    package: {
      description: 'Textbook order — 2 titles',
      category: 'books',
      quantity: 2,
      weightKg: 2.4,
      dimensions: { l: 30, w: 22, h: 12 },
      sizeTier: 'small',
      photos: [svgPhoto('TEXTBOOKS ×2', '#b7791f')],
      fragile: false,
      food: false,
      declaredValue: null,
      handlingNotes: '',
      contentsDeclared: true,
    },
    status: 'awaiting_rider',
    kind: 'scheduled',
    scheduledFor: tomorrow,
    createdAt: today13 - 2 * 3600_000,
  });
  d103.payment = {
    id: 'pay-103',
    deliveryId: 'd-103',
    method: 'wallet',
    amount: d103.quote.total,
    status: 'succeeded',
    gatewayRef: 'WAL-8813',
    idempotencyKey: 'idem-103',
    events: [{ at: today13 - 2 * 3600_000, status: 'initiated' }, { at: today13 - 2 * 3600_000 + 1500, status: 'succeeded' }],
  };
  const ledger103 = buildLedger(d103.quote.total, CONFIG_DEFAULTS.pricing);
  ledger103.deliveryId = 'd-103';
  d103.ledger = ledger103;

  // Disputed delivery (Tunde)
  const d105 = baseDelivery({
    id: 'd-105',
    ref: 'RX-0105',
    customerId: 'u-tunde',
    stops: [
      { id: 's-7', kind: 'pickup', ...lm('oke-baale', 'lm-pharmacy') },
      { id: 's-8', kind: 'dropoff', ...lm('oke-baale', 'lm-student-village'), receiver: { name: 'Tunde Bakare', phone: '0803 111 0002' } },
    ],
    package: {
      description: 'Wireless earbuds (sealed box)',
      category: 'electronics',
      quantity: 1,
      weightKg: 0.3,
      dimensions: { l: 15, w: 12, h: 6 },
      sizeTier: 'small',
      photos: [svgPhoto('EARBUDS — SEALED', '#6b46c1', 'declared value ₦42,000')],
      fragile: true,
      food: false,
      declaredValue: 42000,
      handlingNotes: 'Fragile electronics.',
      contentsDeclared: true,
    },
    status: 'disputed',
    createdAt: yesterday - 6 * 3600_000,
    riderId: 'r-kofi',
    disputeId: 'c-201',
  });
  d105.statusHistory = [{ status: 'disputed', at: yesterday, note: 'Receiver reported damaged packaging', actorId: 'u-tunde' }];
  d105.payment = {
    id: 'pay-105',
    deliveryId: 'd-105',
    method: 'card',
    amount: d105.quote.total,
    status: 'succeeded',
    gatewayRef: 'CARD-66901',
    idempotencyKey: 'idem-105',
    events: [{ at: yesterday - 6 * 3600_000, status: 'initiated' }, { at: yesterday - 6 * 3600_000 + 3000, status: 'succeeded' }],
  };
  const ledger105 = buildLedger(d105.quote.total, CONFIG_DEFAULTS.pricing);
  ledger105.deliveryId = 'd-105';
  d105.ledger = ledger105;

  // Delivered 3 days ago — ledger ready for settlement (finance demo)
  const d106 = baseDelivery({
    id: 'd-106',
    ref: 'RX-0106',
    customerId: 'u-tunde',
    stops: [
      { id: 's-9', kind: 'pickup', ...lm('osogbo-campus', 'lm-union') },
      { id: 's-10', kind: 'dropoff', ...lm('osogbo-campus', 'lm-hostel-a'), receiver: { name: 'Ada Obi', phone: '0803 111 0001' } },
    ],
    package: {
      description: 'Snack box for study group',
      category: 'food',
      quantity: 1,
      weightKg: 3,
      dimensions: { l: 35, w: 25, h: 20 },
      sizeTier: 'medium',
      photos: [svgPhoto('SNACK BOX', '#c05621', 'sealed — demo')],
      fragile: false,
      food: true,
      declaredValue: null,
      handlingNotes: 'Sealed food packaging.',
      contentsDeclared: true,
    },
    status: 'delivered',
    createdAt: threeDaysAgo,
    riderId: 'r-chidi',
  });
  d106.payment = {
    id: 'pay-106',
    deliveryId: 'd-106',
    method: 'transfer',
    amount: d106.quote.total,
    status: 'succeeded',
    gatewayRef: 'TRF-33017',
    idempotencyKey: 'idem-106',
    events: [{ at: threeDaysAgo, status: 'initiated' }, { at: threeDaysAgo + 8000, status: 'succeeded', note: 'Webhook verified' }],
  };
  const ledger106 = buildLedger(d106.quote.total, CONFIG_DEFAULTS.pricing);
  ledger106.deliveryId = 'd-106';
  ledger106.settlement = 'ready';
  d106.ledger = ledger106;

  /* ---- recurring plan ------------------------------------------------------ */
  const nextThu = (() => {
    const d = new Date(today13);
    const day = d.getDay(); // 0 Sun..6 Sat
    const delta = (4 - day + 7) % 7 || 7; // next Thursday
    return new Date(d.getTime() + delta * DAY).setHours(8, 30, 0, 0);
  })();
  const recurring: RecurrencePlan[] = [
    {
      id: 'rec-1',
      deliveryId: 'd-104',
      days: [1, 4], // Mon & Thu
      time: '08:30',
      active: true,
      nextOccurrence: nextThu,
      occurrences: [],
    },
  ];
  const d104 = baseDelivery({
    id: 'd-104',
    ref: 'RX-0104',
    customerId: 'u-ada',
    stops: [
      { id: 's-11', kind: 'pickup', ...lm('oke-baale', 'lm-market') },
      { id: 's-12', kind: 'dropoff', ...lm('osogbo-campus', 'lm-hostel-a'), receiver: { name: 'Ada Obi', phone: '0803 111 0001' } },
    ],
    package: {
      description: 'Weekly fresh provisions run',
      category: 'groceries',
      quantity: 2,
      weightKg: 8,
      dimensions: { l: 40, w: 30, h: 25 },
      sizeTier: 'medium',
      photos: [svgPhoto('PROVISIONS', '#2f855a')],
      fragile: false,
      food: false,
      declaredValue: null,
      handlingNotes: 'Standard handling.',
      contentsDeclared: true,
    },
    status: 'delivered',
    kind: 'recurring',
    recurrenceId: 'rec-1',
    createdAt: threeDaysAgo - 3600_000,
    riderId: 'r-blessing',
    rating: { stars: 4, tags: ['communicative'], comment: '', at: threeDaysAgo + 7200_000 },
  });
  d104.payment = {
    id: 'pay-104',
    deliveryId: 'd-104',
    method: 'wallet',
    amount: d104.quote.total,
    status: 'succeeded',
    gatewayRef: 'WAL-7710',
    idempotencyKey: 'idem-104',
    events: [{ at: threeDaysAgo - 3600_000, status: 'initiated' }, { at: threeDaysAgo - 3600_000 + 1000, status: 'succeeded' }],
  };
  const ledger104 = buildLedger(d104.quote.total, CONFIG_DEFAULTS.pricing);
  ledger104.deliveryId = 'd-104';
  ledger104.settlement = 'settled';
  ledger104.settledAt = threeDaysAgo + 5 * 3600_000;
  ledger104.payoutId = 'pay-out-1';
  d104.ledger = ledger104;

  const deliveries = [d101, d102, d103, d104, d105, d106];

  /* ---- cases ---------------------------------------------------------------- */
  const disputes: Dispute[] = [
    {
      id: 'c-201',
      deliveryId: 'd-105',
      openedBy: 'u-tunde',
      reason: 'Package arrived damaged',
      description: 'The sealed box was crushed on one side. Earbuds appear scratched. Photos attached to the case record.',
      status: 'under_review',
      events: [
        { at: yesterday, by: 'Tunde Bakare', note: 'Case opened by receiver.' },
        { at: yesterday + 1800_000, by: 'Mrs. Bello (Ops)', note: 'Reviewing verification records, photos and rider route history.' },
      ],
      openedAt: yesterday,
    },
  ];

  const incidents: Incident[] = [
    {
      id: 'i-301',
      deliveryId: null,
      riderId: 'r-kofi',
      kind: 'unsafe_area',
      note: 'Reported poor lighting and harassment near the market path after 7 PM. No injuries.',
      status: 'resolved',
      events: [
        { at: yesterday - 2 * DAY, by: 'Kofi M. (rider)', note: 'Incident reported via rider app.' },
        { at: yesterday - 2 * DAY + 5 * 3600_000, by: 'Mrs. Bello (Ops)', note: 'Rider counselled to avoid the path after dark; route guidance updated. No penalty applied — safety report.' },
      ],
      openedAt: yesterday - 2 * DAY,
      resolvedAt: yesterday - 2 * DAY + 5 * 3600_000,
    },
  ];

  /* ---- notifications ---------------------------------------------------------- */
  const notifications: Notification[] = [
    {
      id: 'n-1',
      userId: 'u-ada',
      category: 'delivery',
      title: 'Your rider is on the way',
      body: 'Blessing (4.8★, motorcycle) is heading to Hostel Block A with your groceries.',
      at: today13 - 30 * 60_000,
      read: false,
      deliveryId: 'd-102',
    },
    {
      id: 'n-2',
      userId: 'u-ada',
      category: 'payment',
      title: 'Payment successful',
      body: 'Card payment for RX-0102 succeeded. Receipt is in your wallet.',
      at: today13 - 40 * 60_000,
      read: true,
      deliveryId: 'd-102',
    },
    {
      id: 'n-3',
      userId: null,
      category: 'system',
      title: 'Welcome to the ROOT-X pilot',
      body: 'This is a prototype with demo data. Service hours: 8 AM – 9 PM with a 6 PM safety notice.',
      at: today13 - 3 * 3600_000,
      read: false,
    },
  ];

  /* ---- audit ------------------------------------------------------------------ */
  const auditLog: AuditEntry[] = [
    {
      id: 'a-1',
      at: threeDaysAgo - 40 * DAY,
      actorId: 'u-admin',
      actorName: 'Mrs. Bello (Ops)',
      action: 'rider_application.approve',
      target: 'app-1001 (Chidi Okafor)',
      reason: 'Documents verified',
      before: 'under_review',
      after: 'approved',
    },
    {
      id: 'a-2',
      at: yesterday - 2 * DAY,
      actorId: 'u-admin',
      actorName: 'Mrs. Bello (Ops)',
      action: 'incident.resolve',
      target: 'i-301',
      reason: 'Safety report confirmed; guidance updated',
      before: 'supporting',
      after: 'resolved',
    },
  ];

  const payouts: Payout[] = [
    {
      id: 'pay-out-1',
      riderId: 'r-chidi',
      amount: 5200,
      status: 'paid',
      requestedAt: yesterday - 2 * DAY,
      processedAt: yesterday - 2 * DAY + 86400_000 / 24,
      batchId: null,
    },
  ];

  const config: AppConfig = {
    ...CONFIG_DEFAULTS,
    zonesActive: { 'okuku-campus': false },
    version: 3,
    updatedAt: threeDaysAgo,
  };

  return {
    users,
    riders,
    applications,
    deliveries,
    recurring,
    disputes,
    incidents,
    notifications,
    auditLog,
    payouts,
    config,
    epoch: today13,
  };
}

export const ZONES_SEED = [OSOGBO_CAMPUS, OKE_BAAALE];
