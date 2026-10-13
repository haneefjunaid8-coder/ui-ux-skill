/* ============================================================================
   ROOT-X domain types — mirrors the production DB schema (see database/).
   All money values are whole NGN in the prototype. The production ledger
   uses kobo (integer minor units) — see docs/10-payments.md.
   ========================================================================== */

export type Role = 'customer' | 'rider' | 'admin' | 'finance';

export interface SavedLocation {
  id: string;
  label: string;
  landmarkId?: string;
  x: number;
  y: number;
  zoneId: string;
}

export interface UserAccount {
  id: string;
  name: string;
  phone: string;
  role: Role;
  zoneId: string;
  walletBalance: number;
  createdAt: number;
  savedLocations: SavedLocation[];
  notifyPrefs: { push: boolean; sms: boolean; email: boolean };
}

/* ---- rider verification -------------------------------------------------- */

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'info_required'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'expired';

export type TransportType = 'foot' | 'bicycle' | 'motorcycle';

export interface RiderApplication {
  id: string;
  userId: string;
  fullName: string;
  matricNumber: string;
  studentIdDoc: string; // private storage ref — never exposed to ordinary users
  phone: string;
  emergencyContact: { name: string; phone: string; relationship: string };
  transport: TransportType;
  zoneId: string;
  status: ApplicationStatus;
  submittedAt: number;
  reviewNotes: { at: number; by: string; note: string; decision?: ApplicationStatus }[];
  termsAcceptedAt: number;
}

export interface RiderProfile {
  id: string;
  userId: string;
  applicationId: string;
  transport: TransportType;
  capacityKg: number;
  capacityLiters: number;
  zoneId: string;
  isAvailable: boolean;
  simulated: boolean; // demo riders advance automatically
  workingHours: { start: string; end: string }[];
  rating: number;
  completed: number;
  onTimeRate: number;
  pendingEarnings: number; // awaiting settlement
  availableEarnings: number; // ready for payout
  location: { x: number; y: number } | null;
  locationUpdatedAt: number | null;
}

/* ---- zones ------------------------------------------------------------- */

export interface Landmark {
  id: string;
  name: string;
  x: number;
  y: number;
  kind: 'gate' | 'academic' | 'hostel' | 'commercial' | 'health' | 'transport';
}

export interface Zone {
  id: string;
  campus: string;
  name: string;
  kind: 'campus' | 'township';
  active: boolean;
  // schematic polygon in map units (1 unit = 100 m) — demo geometry,
  // to be replaced by surveyed boundaries before launch
  polygon: { x: number; y: number }[];
  landmarks: Landmark[];
  restricted: { x: number; y: number; w: number; h: number; label: string }[];
  hours: { open: number; close: number }; // overrides global defaults when set
}

/* ---- deliveries ---------------------------------------------------------- */

export type DeliveryStatus =
  | 'draft'
  | 'awaiting_payment'
  | 'payment_processing'
  | 'awaiting_rider'
  | 'offered_to_riders'
  | 'rider_assigned'
  | 'rider_approaching_pickup'
  | 'at_pickup'
  | 'pickup_verification_pending'
  | 'package_collected'
  | 'in_transit'
  | 'approaching_destination'
  | 'delivery_verification_pending'
  | 'delivered'
  | 'cancellation_requested'
  | 'cancelled'
  | 'return_required'
  | 'disputed'
  | 'under_review';

export type PackageCategory =
  | 'documents'
  | 'books'
  | 'food'
  | 'groceries'
  | 'clothing'
  | 'electronics'
  | 'pharmacy'
  | 'business_stock'
  | 'other';

export type SizeTier = 'small' | 'medium' | 'large' | 'xlarge';

export interface PackageInfo {
  description: string;
  category: PackageCategory;
  quantity: number;
  weightKg: number;
  dimensions: { l: number; w: number; h: number }; // cm
  sizeTier: SizeTier;
  photos: string[]; // data URLs in the prototype; signed private URLs in production
  fragile: boolean;
  food: boolean;
  declaredValue: number | null;
  handlingNotes: string;
  contentsDeclared: boolean; // sender declaration of legality/eligibility
}

export interface Stop {
  id: string;
  kind: 'pickup' | 'dropoff';
  label: string;
  landmarkId?: string;
  x: number;
  y: number;
  zoneId: string;
  receiver?: { name: string; phone: string };
}

export type DeliveryKind = 'immediate' | 'scheduled' | 'recurring';

export interface RecurrencePlan {
  id: string;
  deliveryId: string;
  days: number[]; // 0=Sun..6=Sat
  time: string; // "08:30"
  active: boolean;
  nextOccurrence: number;
  occurrences: { date: number; deliveryId: string | null; skipped: boolean }[];
}

export interface PriceLine {
  key: string;
  label: string;
  amount: number;
}

export interface PriceQuote {
  lines: PriceLine[];
  total: number;
  distanceKm: number;
  etaMinutes: number;
  currency: 'NGN';
}

export type PaymentMethod = 'wallet' | 'card' | 'transfer';

export interface PaymentRecord {
  id: string;
  deliveryId: string;
  method: PaymentMethod;
  amount: number;
  status: 'initiated' | 'processing' | 'succeeded' | 'failed';
  gatewayRef: string;
  idempotencyKey: string;
  events: { at: number; status: PaymentRecord['status']; note?: string }[];
}

export interface LedgerRecord {
  deliveryId: string;
  charge: number;
  gatewayFee: number;
  commission: number;
  adjustments: { label: string; amount: number }[]; // negative = platform pays out
  riderNet: number;
  refunded: number;
  settlement: 'pending' | 'ready' | 'settled';
  settledAt: number | null;
  payoutId: string | null;
}

export interface StatusEvent {
  status: DeliveryStatus;
  at: number;
  note?: string;
  actorId?: string;
}

export interface VerificationState {
  pickupAttempts: number;
  deliveryAttempts: number;
  pickupLockedUntil: number | null;
  deliveryLockedUntil: number | null;
  pickupVerifiedAt: number | null;
  deliveryVerifiedAt: number | null;
}

export interface Delivery {
  id: string;
  ref: string; // human reference e.g. RX-0142
  customerId: string;
  createdAt: number;
  kind: DeliveryKind;
  scheduledFor: number | null;
  recurrenceId: string | null;
  stops: Stop[];
  package: PackageInfo;
  status: DeliveryStatus;
  statusHistory: StatusEvent[];
  riderId: string | null;
  offer: { offeredTo: string[]; offeredAt: number; expiresAt: number; round: number } | null;
  quote: PriceQuote;
  payment: PaymentRecord | null;
  ledger: LedgerRecord | null;
  trackingToken: { token: string; expiresAt: number; revoked: boolean };
  pickupCode: string;
  deliveryCode: string;
  verification: VerificationState;
  route: { points: { x: number; y: number }[]; distanceKm: number; etaMinutes: number };
  riderProgress: number; // 0..1 along route while in transit
  riderLocation: { x: number; y: number; updatedAt: number; stale: boolean } | null;
  cancelReason: string | null;
  cancelledAt: number | null;
  cancelledBy: string | null;
  disputeId: string | null;
  safetyFlags: string[];
  rating: { stars: number; tags: string[]; comment: string; at: number } | null;
}

/* ---- cases --------------------------------------------------------------- */

export interface CaseEvent {
  at: number;
  by: string;
  note: string;
}

export interface Dispute {
  id: string;
  deliveryId: string;
  openedBy: string; // user id or 'receiver:token'
  reason: string;
  description: string;
  status: 'open' | 'under_review' | 'resolved';
  events: CaseEvent[];
  resolution?: { outcome: string; refundAmount: number; at: number; by: string };
  openedAt: number;
}

export interface Incident {
  id: string;
  deliveryId: string | null;
  riderId: string;
  kind: 'sos' | 'harassment' | 'accident' | 'unsafe_area' | 'other';
  note: string;
  status: 'open' | 'supporting' | 'resolved';
  events: CaseEvent[];
  openedAt: number;
  resolvedAt: number | null;
}

/* ---- notifications & audit ------------------------------------------------ */

export interface Notification {
  id: string;
  userId: string | null; // null = broadcast
  category: 'account' | 'delivery' | 'payment' | 'safety' | 'system';
  title: string;
  body: string;
  at: number;
  read: boolean;
  deliveryId?: string;
}

export interface AuditEntry {
  id: string;
  at: number;
  actorId: string;
  actorName: string;
  action: string;
  target: string;
  reason?: string;
  before?: string;
  after?: string;
}

/* ---- payouts --------------------------------------------------------------- */

export interface Payout {
  id: string;
  riderId: string;
  amount: number;
  status: 'requested' | 'approved' | 'paid' | 'rejected';
  requestedAt: number;
  processedAt: number | null;
  batchId: string | null;
}

export interface SettlementBatch {
  id: string;
  createdById: string;
  createdAt: number;
  ledgerIds: string[];
  amount: number;
  status: 'awaiting_approval' | 'approved' | 'rejected';
  approvedById: string | null;
}

/* ---- wallet top-ups (gateway lifecycle, credited by webhook) ------------------ */

export interface TopUp {
  id: string;
  userId: string;
  amount: number;
  method: 'card' | 'transfer';
  status: 'processing' | 'succeeded' | 'failed';
  gatewayRef: string;
  idempotencyKey: string;
  events: { at: number; status: string; note: string }[];
}

/* ---- configuration (admin-managed, versioned, audited) --------------------- */

export interface PricingConfig {
  currency: 'NGN';
  baseFare: number;
  perKm: number;
  includedKm: number;
  sizeTierFees: Record<SizeTier, number>;
  includedWeightKg: number;
  perExtraKg: number;
  fragileFee: number;
  foodSealedFee: number;
  highValuePct: number;
  highValueFeeCap: number;
  highValueThreshold: number; // declared value at which high-value rules apply
  maxDeclaredValue: number;
  extraStopFee: number;
  minFare: number;
  commissionPct: number;
  gatewayFeeFixed: number;
  gatewayFeePct: number;
}

export interface ServiceHoursConfig {
  openHour: number; // 8
  warningHour: number; // 18 — the 6 PM warning
  closeHour: number; // 21 — the 9 PM closure
  bookingCutoffBufferMin: number; // booking must finish this long before close
  handlingBufferMin: number; // added to ETA when evaluating cutoff
  activeGraceMin: number; // window after close for safe resolution of active runs
  cancellationFeeStages: { label: string; beforeStatus: DeliveryStatus[]; fee: number; refundRider: boolean }[];
}

export interface Policies {
  interZonePolicy: 'intra_zone_only' | 'same_campus' | 'any_active_zone';
  fragileTransportFloor: TransportType; // fragile requires at least this transport
  highValueMinRating: number;
  highValueMinCompleted: number;
  otpLockoutAttempts: number;
  otpLockoutMinutes: number;
  failedDeliveryWaitMin: number;
  payoutMinAmount: number;
  guestTokenHours: number;
}

export interface AppConfig {
  pricing: PricingConfig;
  hours: ServiceHoursConfig;
  policies: Policies;
  zonesActive: Record<string, boolean>;
  version: number;
  updatedAt: number;
}

/* ---- network simulation (prototype) ---------------------------------------- */

export interface QueuedUpdate {
  id: string;
  deliveryId: string;
  action: string;
  label: string;
  at: number;
}
