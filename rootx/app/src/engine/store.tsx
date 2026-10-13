import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type {
  AppConfig,
  AuditEntry,
  Delivery,
  DeliveryStatus,
  Dispute,
  Incident,
  Notification,
  Payout,
  PaymentMethod,
  PriceQuote,
  QueuedUpdate,
  RecurrencePlan,
  RiderApplication,
  RiderProfile,
  SettlementBatch,
  Stop,
  UserAccount,
  PackageInfo,
  DeliveryKind,
} from './types';
import { buildSeed } from './seed';
import { ALL_ZONES } from './zones';
import { transition, cancellationStage } from './stateMachine';
import { eligibleRiders, offerExpiry } from './matching';
import { checkPickupCode, checkDeliveryCode, generateCode, generateToken } from './verification';
import { buildLedger } from './ledger';
import { quote as computeQuote, validatePackage, splitLedger } from './pricing';
import { evaluateServiceWindow, activeDeliveryGuidance, crossedWarning, crossedClose, minutesOfDay, scheduledSlotOk } from './safety';

/* ============================================================================
   ROOT-X prototype store.
   ----------------------------------------------------------------------------
   Mirrors the production backend's authoritative rules: state-machine guards,
   verification codes with lockout, payment idempotency, audited admin actions,
   financial ledger invariants, safety-hours enforcement and single-assignment
   offers. Persistence is localStorage in the prototype; production is
   PostgreSQL with transactions (see docs/06, docs/10).
   ========================================================================== */

export interface AppState {
  version: number;
  clock: { epoch: number; speed: number };
  session: { userId: string | null; mfaFor: string | null };
  otp: { phone: string; code: string; attempts: number; lockedUntil: number; pendingUserId: string | null; registering: Partial<UserAccount> | null } | null;
  users: UserAccount[];
  riders: RiderProfile[];
  applications: RiderApplication[];
  deliveries: Delivery[];
  recurring: RecurrencePlan[];
  payouts: Payout[];
  batches: SettlementBatch[];
  disputes: Dispute[];
  incidents: Incident[];
  notifications: Notification[];
  auditLog: AuditEntry[];
  config: AppConfig;
  demo: { gpsLoss: boolean; offline: boolean; forcePaymentFail: boolean };
  networkQueue: QueuedUpdate[];
  safetyEvents: { warningDay: number | null; closeDay: number | null };
  seq: number;
}

const STORAGE_KEY = 'rootx-state-v1';

export function init(base?: AppState): AppState {
  if (base) return base;
  const seed = buildSeed(Date.now());
  return {
    version: 1,
    clock: { epoch: seed.epoch, speed: 1 },
    session: { userId: null, mfaFor: null },
    otp: null,
    users: seed.users,
    riders: seed.riders,
    applications: seed.applications,
    deliveries: seed.deliveries,
    recurring: seed.recurring,
    payouts: seed.payouts,
    batches: [],
    disputes: seed.disputes,
    incidents: seed.incidents,
    notifications: seed.notifications,
    auditLog: seed.auditLog,
    config: seed.config,
    demo: { gpsLoss: false, offline: false, forcePaymentFail: false },
    networkQueue: [],
    safetyEvents: { warningDay: null, closeDay: null },
    seq: 1000,
  };
}

function load(): AppState | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as AppState;
    if (parsed.version !== 1) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

/* ---- action types --------------------------------------------------------- */

export interface NewDeliveryInput {
  kind: DeliveryKind;
  scheduledFor: number | null;
  stops: Stop[];
  pkg: PackageInfo;
  transport: 'foot' | 'bicycle' | 'motorcycle';
  recurrence?: { days: number[]; time: string } | null;
}

export type Action =
  | { type: 'clock/set'; epoch: number }
  | { type: 'clock/speed'; speed: number }
  | { type: 'tick' }
  | { type: 'auth/otpRequest'; phone: string; registering?: { name: string; zoneId: string } }
  | { type: 'auth/otpVerify'; code: string }
  | { type: 'auth/mfaVerify'; code: string }
  | { type: 'auth/quickLogin'; userId: string }
  | { type: 'auth/logout' }
  | { type: 'auth/register' }
  | { type: 'delivery/create'; input: NewDeliveryInput }
  | { type: 'delivery/pay'; deliveryId: string; method: PaymentMethod }
  | { type: 'delivery/offer'; deliveryId: string }
  | { type: 'delivery/accept'; deliveryId: string; riderId: string }
  | { type: 'delivery/decline'; deliveryId: string; riderId: string }
  | { type: 'delivery/riderAction'; deliveryId: string; action: 'approach' | 'arrive_pickup' | 'request_pickup_code' | 'collect' | 'depart' | 'approach_dest' | 'arrive_dest' | 'request_delivery_code' }
  | { type: 'delivery/verifyCode'; deliveryId: string; kind: 'pickup' | 'delivery'; code: string; by: 'rider' | 'receiver' }
  | { type: 'delivery/cancel'; deliveryId: string; reason: string; by: string; actorName: string }
  | { type: 'delivery/rate'; deliveryId: string; stars: number; tags: string[]; comment: string }
  | { type: 'delivery/reportProblem'; deliveryId: string; reason: string; description: string; by: string }
  | { type: 'delivery/returnToSender'; deliveryId: string }
  | { type: 'recurring/update'; planId: string; patch: Partial<Pick<RecurrencePlan, 'active' | 'days' | 'time'>>; skipNext?: boolean }
  | { type: 'tracking/revoke'; deliveryId: string }
  | { type: 'tracking/rotate'; deliveryId: string }
  | { type: 'rider/submitApplication'; app: Omit<RiderApplication, 'id' | 'status' | 'submittedAt' | 'reviewNotes'> }
  | { type: 'rider/availability'; riderId: string; available: boolean }
  | { type: 'rider/sos'; riderId: string; deliveryId: string | null; kind: 'sos' | 'harassment' | 'accident' | 'unsafe_area' | 'other'; note: string }
  | { type: 'rider/payoutRequest'; riderId: string; amount: number }
  | { type: 'admin/reviewApplication'; applicationId: string; decision: 'approved' | 'rejected' | 'info_required' | 'suspended'; reason: string }
  | { type: 'admin/updateConfig'; patch: { pricing?: Partial<AppConfig['pricing']>; hours?: Partial<AppConfig['hours']>; policies?: Partial<AppConfig['policies']> }; reason: string }
  | { type: 'admin/zoneActive'; zoneId: string; active: boolean; reason: string }
  | { type: 'admin/resolveDispute'; caseId: string; outcome: string; refundAmount: number; fromRiderShare: boolean; note: string }
  | { type: 'admin/resolveIncident'; incidentId: string; note: string }
  | { type: 'admin/settlementRun' }
  | { type: 'admin/approveSettlement'; batchId: string }
  | { type: 'admin/rejectSettlement'; batchId: string; reason: string }
  | { type: 'notifications/read'; ids: string[] }
  | { type: 'demo/toggle'; key: 'gpsLoss' | 'offline' | 'forcePaymentFail' }
  | { type: 'demo/reconnect' }
  | { type: 'app/reset' };

/* ---- helpers --------------------------------------------------------------- */

let auditSeq = 1;
function audit(state: AppState, actorId: string, action: string, target: string, extra: Partial<AuditEntry> = {}): AuditEntry {
  const actor = state.users.find((u) => u.id === actorId);
  return {
    id: 'a-' + Date.now() + '-' + auditSeq++,
    at: state.clock.epoch,
    actorId,
    actorName: actor?.name ?? 'system',
    action,
    target,
    ...extra,
  };
}

function notify(state: AppState, n: Omit<Notification, 'id' | 'at' | 'read'>): Notification {
  return { id: 'n-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), at: state.clock.epoch, read: false, ...n };
}

function pushStatus(d: Delivery, status: DeliveryStatus, note?: string, actorId?: string): Delivery {
  return { ...d, status, statusHistory: [...d.statusHistory, { status, at: 0 /* filled by caller */, note, actorId }] };
}

function routeFor(stops: Stop[]): { x: number; y: number }[] {
  // Straight-line schematic route. Production uses a routing engine with
  // campus gate/path awareness (docs/11-mapping.md).
  return stops.map((s) => ({ x: s.x, y: s.y }));
}

function interpolate(points: { x: number; y: number }[], t: number): { x: number; y: number } {
  if (points.length < 2) return points[0] ?? { x: 0, y: 0 };
  const segs = points.length - 1;
  const ft = Math.min(0.999, Math.max(0, t)) * segs;
  const i = Math.floor(ft);
  const f = ft - i;
  return { x: points[i].x + (points[i + 1].x - points[i].x) * f, y: points[i].y + (points[i + 1].y - points[i].y) * f };
}

function riderOf(state: AppState, id: string | null) {
  return state.riders.find((r) => r.id === id);
}

function userOf(state: AppState, id: string | null) {
  return state.users.find((u) => u.id === id);
}

function guardTransition(d: Delivery, to: DeliveryStatus, evidence: Parameters<typeof transition>[2]): { ok: boolean; reason?: string } {
  return transition(d.status, to, evidence);
}

function isSimRider(state: AppState, riderId: string | null): boolean {
  return riderOf(state, riderId)?.simulated ?? false;
}

/* ---- reducer ---------------------------------------------------------------- */

export function reducer(state: AppState, action: Action): AppState {
  const now = state.clock.epoch;

  switch (action.type) {
    /* ---- demo clock ---- */
    case 'clock/set':
      return { ...state, clock: { ...state.clock, epoch: action.epoch } };
    case 'clock/speed':
      return { ...state, clock: { ...state.clock, speed: action.speed } };

    /* ---- simulation tick ---- */
    case 'tick': {
      const stepMs = 1000 * state.clock.speed;
      const newEpoch = now + stepMs;
      let s: AppState = { ...state, clock: { ...state.clock, epoch: newEpoch } };
      const day = Math.floor(newEpoch / 86_400_000);
      const prevMins = minutesOfDay(now);
      const nextMins = minutesOfDay(newEpoch);
      const notifs: Notification[] = [];

      // safety-hours broadcast crossings
      if (crossedWarning(prevMins, nextMins, s.config.hours) && s.safetyEvents.warningDay !== day) {
        notifs.push(
          notify(s, {
            userId: null,
            category: 'safety',
            title: '6 PM safety notice',
            body: 'Service closes at 9 PM. Only start deliveries that can finish safely before closing. Riders already on the road should finish the handover at hand.',
          }),
        );
        s = { ...s, safetyEvents: { ...s.safetyEvents, warningDay: day } };
      }
      if (crossedClose(prevMins, nextMins, s.config.hours) && s.safetyEvents.closeDay !== day) {
        notifs.push(
          notify(s, {
            userId: null,
            category: 'safety',
            title: '9 PM — new delivery activity closed',
            body: 'New bookings and assignments are paused for safety. Active deliveries continue to a safe resolution. Emergency reporting remains available.',
          }),
        );
        s = { ...s, safetyEvents: { ...s.safetyEvents, closeDay: day } };
      }

      // pending transfer/card payment webhooks (simulated gateway callback)
      let deliveries = s.deliveries.map((d) => {
        if (d.payment && d.payment.status === 'processing' && d.status === 'payment_processing') {
          const started = d.payment.events[0]?.at ?? 0;
          if (newEpoch - started > (d.payment.method === 'transfer' ? 25_000 : 8_000)) {
            const success = !s.demo.forcePaymentFail;
            const payment = {
              ...d.payment,
              status: success ? ('succeeded' as const) : ('failed' as const),
              events: [...d.payment.events, { at: newEpoch, status: success ? ('succeeded' as const) : ('failed' as const), note: success ? 'Gateway webhook verified (signature ok)' : 'Gateway declined' }],
            };
            if (success) {
              const t = guardTransition(d, 'awaiting_rider', { paymentSucceeded: true });
              if (t.ok) {
                notifs.push(notify(s, { userId: d.customerId, category: 'payment', title: 'Payment successful', body: `${d.ref} is paid. Finding a rider…`, deliveryId: d.id }));
                const ledger = buildLedger(payment.amount, s.config.pricing);
                ledger.deliveryId = d.id;
                return {
                  ...d,
                  payment,
                  ledger,
                  status: 'awaiting_rider' as DeliveryStatus,
                  statusHistory: [...d.statusHistory, { status: 'awaiting_rider' as DeliveryStatus, at: newEpoch, note: 'Payment verified', actorId: 'system' }],
                };
              }
            } else {
              notifs.push(notify(s, { userId: d.customerId, category: 'payment', title: 'Payment failed', body: `${d.ref}: the payment did not go through. No money was taken — you can retry.`, deliveryId: d.id }));
              return {
                ...d,
                payment,
                status: 'awaiting_payment' as DeliveryStatus,
                statusHistory: [...d.statusHistory, { status: 'awaiting_payment' as DeliveryStatus, at: newEpoch, note: 'Payment failed', actorId: 'system' }],
              };
            }
          }
        }
        return d;
      });

      // offers: simulate acceptance by best simulated rider shortly after offer,
      // escalate rounds on expiry
      deliveries = deliveries.map((d) => {
        if (d.status !== 'offered_to_riders' || !d.offer) return d;
        const bestSim = eligibleRiders(d, s.riders.filter((r) => r.simulated), s.config.policies).eligible.find((c) => !c.rider.isAvailable ? false : true);
        const acceptAt = d.offer.offeredAt + 15_000 * d.offer.round;
        if (bestSim && newEpoch >= acceptAt) {
          const t = guardTransition(d, 'rider_assigned', { riderAssigned: false, paymentSucceeded: true });
          if (!t.ok) return d;
          const rider = bestSim.rider;
          notifs.push(notify(s, { userId: d.customerId, category: 'delivery', title: 'Rider found', body: `${riderName(s, rider.id)} accepted ${d.ref}.`, deliveryId: d.id }));
          return {
            ...d,
            status: 'rider_assigned' as DeliveryStatus,
            riderId: rider.id,
            offer: null,
            statusHistory: [...d.statusHistory, { status: 'rider_assigned' as DeliveryStatus, at: newEpoch, note: 'Rider accepted offer', actorId: rider.id }],
          };
        }
        if (newEpoch >= d.offer.expiresAt) {
          if (d.offer.round < 3) {
            return { ...d, offer: { ...d.offer, round: d.offer.round + 1, offeredAt: newEpoch, expiresAt: offerExpiry(newEpoch, d.offer.round + 1) } };
          }
          notifs.push(notify(s, { userId: d.customerId, category: 'delivery', title: 'Still finding a rider', body: `No rider has accepted ${d.ref} yet. You can keep waiting or cancel for a full refund.`, deliveryId: d.id }));
          return { ...d, status: 'awaiting_rider' as DeliveryStatus, offer: null, statusHistory: [...d.statusHistory, { status: 'awaiting_rider' as DeliveryStatus, at: newEpoch, note: 'Offer expired — awaiting re-match', actorId: 'system' }] };
        }
        return d;
      });

      // scheduled dispatch
      deliveries = deliveries.map((d) => {
        if (d.status === 'awaiting_rider' && d.scheduledFor && newEpoch >= d.scheduledFor && d.payment?.status === 'succeeded') {
          const el = eligibleRiders(d, s.riders, s.config.policies).eligible.map((c) => c.rider.id);
          return {
            ...d,
            status: 'offered_to_riders' as DeliveryStatus,
            offer: { offeredTo: el, offeredAt: newEpoch, expiresAt: offerExpiry(newEpoch, 1), round: 1 },
            statusHistory: [...d.statusHistory, { status: 'offered_to_riders' as DeliveryStatus, at: newEpoch, note: 'Scheduled slot reached — offered to riders', actorId: 'system' }],
          };
        }
        return d;
      });

      // simulated rider progression
      deliveries = deliveries.map((d) => {
        if (!d.riderId || !isSimRider(s, d.riderId)) return d;
        const last = d.statusHistory[d.statusHistory.length - 1];
        const since = newEpoch - (last.at || newEpoch);
        const step = (to: DeliveryStatus, note?: string, minMs = 15_000): Delivery => {
          const t = guardTransition(d, to, {
            paymentSucceeded: true,
            riderAssigned: true,
            pickupCodeVerified: to === 'package_collected' ? true : undefined,
            deliveryCodeVerified: to === 'delivered' ? true : undefined,
          });
          if (!t.ok) return d;
          const verification =
            to === 'package_collected'
              ? { ...d.verification, pickupVerifiedAt: newEpoch }
              : to === 'delivered'
                ? { ...d.verification, deliveryVerifiedAt: newEpoch }
                : d.verification;
          return { ...d, verification, status: to, statusHistory: [...d.statusHistory, { status: to, at: newEpoch, note, actorId: d.riderId ?? undefined }] };
        };
        switch (d.status) {
          case 'rider_assigned':
            return since > 18_000 ? step('rider_approaching_pickup', undefined, 0) : d;
          case 'rider_approaching_pickup':
            return since > 22_000 ? step('at_pickup', undefined, 0) : d;
          case 'at_pickup':
            return since > 6_000 ? step('pickup_verification_pending', undefined, 0) : d;
          case 'pickup_verification_pending':
            return since > 12_000 ? step('package_collected', 'Pickup code verified (demo auto-verification for simulated rider)', 0) : d;
          case 'package_collected':
            return since > 10_000 ? step('in_transit', undefined, 0) : d;
          case 'in_transit': {
            const travelMs = Math.max(30_000, d.route.etaMinutes * 60_000 * 1.5); // compressed for demo
            const p = Math.min(1, d.riderProgress + stepMs / travelMs);
            if (p >= 0.85) return { ...step('approaching_destination', undefined, 0), riderProgress: p };
            return { ...d, riderProgress: p };
          }
          case 'approaching_destination': {
            const travelMs = Math.max(30_000, d.route.etaMinutes * 60_000 * 1.5);
            const p = Math.min(1, d.riderProgress + stepMs / travelMs);
            if (p >= 1) return { ...step('delivery_verification_pending', undefined, 0), riderProgress: 1 };
            return { ...d, riderProgress: p };
          }
          case 'delivery_verification_pending':
            return since > 14_000 ? step('delivered', 'Delivery code verified (demo auto-verification for simulated rider)', 0) : d;
          default:
            return d;
        }
      });

      // delivered → ledger ready + rider pending earnings + notifications
      const riderPendingDelta = new Map<string, number>();
      deliveries = deliveries.map((d) => {
        const was = state.deliveries.find((x) => x.id === d.id);
        if (d.status === 'delivered' && was && was.status !== 'delivered' && d.ledger) {
          const lg = d.ledger;
          if (lg.settlement === 'pending') {
            d = { ...d, ledger: { ...lg, settlement: 'ready' } };
            const prev = riderPendingDelta.get(d.riderId ?? '') ?? 0;
            riderPendingDelta.set(d.riderId ?? '', prev + lg.riderNet);
          }
          notifs.push(notify(s, { userId: d.customerId, category: 'delivery', title: 'Delivered', body: `${d.ref} was delivered and verified. Rate your rider.`, deliveryId: d.id }));
          const r = riderOf(s, d.riderId);
          if (r?.userId) notifs.push(notify(s, { userId: r.userId, category: 'payment', title: 'Earnings credited (pending settlement)', body: `${d.ref} completed — ₦${lg.riderNet.toLocaleString()} pending settlement.`, deliveryId: d.id }));
        }
        return d;
      });

      let riders = s.riders;
      if (riderPendingDelta.size) {
        riders = riders.map((r) => (riderPendingDelta.has(r.id) ? { ...r, pendingEarnings: r.pendingEarnings + (riderPendingDelta.get(r.id) ?? 0) } : r));
      }

      // rider movement + stale handling for in-transit deliveries
      deliveries = deliveries.map((d) => {
        const moving = ['in_transit', 'approaching_destination'].includes(d.status);
        if (!moving) return d;
        if (s.demo.gpsLoss) return d; // location freezes → UI flags stale by age
        const pt = interpolate(d.route.points, d.riderProgress);
        const stage = d.status === 'approaching_destination' && d.riderProgress >= 1 ? pt : pt;
        return { ...d, riderLocation: { x: stage.x, y: stage.y, updatedAt: newEpoch, stale: false } };
      });
      // also drift simulated idle riders slightly (live map feel) — skipped for simplicity

      // recurring occurrence generation
      const newDeliveries: Delivery[] = [];
      let recurring = s.recurring;
      for (const plan of s.recurring) {
        if (!plan.active) continue;
        if (newEpoch < plan.nextOccurrence) continue;
        const template = s.deliveries.find((d) => d.id === plan.deliveryId);
        if (template) {
          const q = computeQuote({ stops: template.stops, pkg: template.package, transport: 'motorcycle', config: s.config.pricing });
          const customer = s.users.find((u) => u.id === template.customerId);
          const id = 'd-' + s.seq++;
          const nd: Delivery = {
            ...template,
            id,
            ref: 'RX-0' + String(s.seq).padStart(3, '0'),
            createdAt: newEpoch,
            status: 'awaiting_rider',
            statusHistory: [{ status: 'awaiting_rider', at: newEpoch, note: 'Recurring occurrence — wallet auto-debit', actorId: 'system' }],
            riderId: null,
            offer: null,
            quote: q,
            payment: {
              id: 'pay-' + id,
              deliveryId: id,
              method: 'wallet',
              amount: q.total,
              status: customer && customer.walletBalance >= q.total ? 'succeeded' : 'failed',
              gatewayRef: 'WAL-REC-' + s.seq,
              idempotencyKey: 'idem-rec-' + id,
              events: [{ at: newEpoch, status: 'initiated' }],
            },
            ledger: null,
            trackingToken: { token: generateToken(), expiresAt: newEpoch + s.config.policies.guestTokenHours * 3600_000, revoked: false },
            pickupCode: generateCode(),
            deliveryCode: generateCode(),
            verification: { pickupAttempts: 0, deliveryAttempts: 0, pickupLockedUntil: null, deliveryLockedUntil: null, pickupVerifiedAt: null, deliveryVerifiedAt: null },
            riderProgress: 0,
            riderLocation: null,
            cancelReason: null,
            cancelledAt: null,
            cancelledBy: null,
            disputeId: null,
            safetyFlags: [],
            rating: null,
            recurrenceId: plan.id,
          };
          if (nd.payment?.status === 'succeeded') {
            const l = buildLedger(q.total, s.config.pricing);
            l.deliveryId = id;
            nd.ledger = l;
            newDeliveries.push(nd);
            notifs.push(notify(s, { userId: template.customerId, category: 'delivery', title: 'Recurring delivery created', body: `${nd.ref} was created from your recurring plan and is finding a rider.`, deliveryId: id }));
          } else {
            notifs.push(notify(s, { userId: template.customerId, category: 'payment', title: 'Recurring plan paused', body: 'Wallet balance was insufficient for the next occurrence. Top up to resume.' }));
            recurring = recurring.map((p) => (p.id === plan.id ? { ...p, active: false } : p));
          }
        }
        // advance to next matching day
        let next = new Date(plan.nextOccurrence + 86_400_000);
        while (!plan.days.includes(next.getDay())) next = new Date(next.getTime() + 86_400_000);
        recurring = recurring.map((p) => (p.id === plan.id ? { ...p, nextOccurrence: next.getTime(), occurrences: [...p.occurrences, { date: plan.nextOccurrence, deliveryId: newDeliveries.find((d) => d.recurrenceId === plan.id)?.id ?? null, skipped: false }] } : p));
      }

      s = {
        ...s,
        deliveries: [...deliveries, ...newDeliveries],
        riders,
        recurring,
        notifications: notifs.length ? [...notifs, ...s.notifications] : s.notifications,
      };
      // debit wallets for recurring auto-debits
      if (newDeliveries.length) {
        s = {
          ...s,
          users: s.users.map((u) => {
            const total = newDeliveries.filter((d) => d.customerId === u.id).reduce((a, d) => a + (d.payment?.amount ?? 0), 0);
            return total ? { ...u, walletBalance: u.walletBalance - total } : u;
          }),
        };
      }
      // auto-offer: paid deliveries awaiting matching are offered to eligible
      // riders (production: a backend matching worker; here the tick loop
      // stands in). Safety-hours and eligibility checks live in delivery/offer.
      for (const d of s.deliveries) {
        if (d.status === 'awaiting_rider' && d.payment?.status === 'succeeded' && (d.kind === 'immediate' || (d.scheduledFor !== null && newEpoch >= d.scheduledFor))) {
          s = reducer(s, { type: 'delivery/offer', deliveryId: d.id });
        }
      }
      return s;
    }

    /* ---- auth ---- */
    case 'auth/otpRequest': {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const user = state.users.find((u) => u.phone.replace(/\s/g, '') === action.phone.replace(/\s/g, ''));
      return {
        ...state,
        otp: { phone: action.phone, code, attempts: 0, lockedUntil: 0, pendingUserId: user?.id ?? null, registering: action.registering ? { name: action.registering.name, zoneId: action.registering.zoneId, phone: action.phone } : null },
      };
    }
    case 'auth/otpVerify': {
      if (!state.otp) return state;
      if (state.clock.epoch < state.otp.lockedUntil) return state;
      if (action.code !== state.otp.code) {
        const attempts = state.otp.attempts + 1;
        const locked = attempts >= 5;
        return { ...state, otp: { ...state.otp, attempts, lockedUntil: locked ? state.clock.epoch + 10 * 60_000 : 0 } };
      }
      const otp = state.otp;
      if (otp.pendingUserId) {
        const u = userOf(state, otp.pendingUserId)!;
        if (u.role === 'admin' || u.role === 'finance') {
          return { ...state, otp: null, session: { userId: null, mfaFor: otp.pendingUserId } };
        }
        return { ...state, otp: null, session: { userId: otp.pendingUserId, mfaFor: null } };
      }
      if (otp.registering) {
        const id = 'u-' + state.seq++;
        const nu: UserAccount = {
          id,
          name: otp.registering.name || 'New Member',
          phone: otp.phone,
          role: 'customer',
          zoneId: otp.registering.zoneId || 'osogbo-campus',
          walletBalance: 0,
          createdAt: state.clock.epoch,
          savedLocations: [],
          notifyPrefs: { push: true, sms: true, email: false },
        };
        return {
          ...state,
          otp: null,
          users: [...state.users, nu],
          session: { userId: id, mfaFor: null },
          notifications: [notify(state, { userId: id, category: 'account', title: 'Welcome to ROOT-X', body: 'Your account is ready. You can send your first delivery now.' }), ...state.notifications],
        };
      }
      return state;
    }
    case 'auth/mfaVerify': {
      // demo TOTP — the code is shown in the UI hint
      if (!state.session.mfaFor || action.code !== '314159') return state;
      return { ...state, session: { userId: state.session.mfaFor, mfaFor: null } };
    }
    case 'auth/quickLogin':
      return { ...state, session: { userId: action.userId, mfaFor: null }, otp: null };
    case 'auth/logout':
      return { ...state, session: { userId: null, mfaFor: null } };
    case 'auth/register':
      return state;

    /* ---- delivery lifecycle ---- */
    case 'delivery/create': {
      const customer = userOf(state, state.session.userId);
      if (!customer) return state;
      const validation = validatePackage(action.input.pkg, state.config.pricing);
      if (!validation.ok) return state;
      const q: PriceQuote = computeQuote({ stops: action.input.stops, pkg: action.input.pkg, transport: action.input.transport, config: state.config.pricing });
      if (action.input.kind === 'scheduled' && action.input.scheduledFor) {
        const slot = scheduledSlotOk(action.input.scheduledFor, q.etaMinutes, state.config.hours);
        if (!slot.ok) return state;
      }
      const id = 'd-' + state.seq++;
      let recurrencePlan: RecurrencePlan | null = null;
      if (action.input.kind === 'recurring' && action.input.recurrence) {
        const [hh, mm] = action.input.recurrence.time.split(':').map(Number);
        let next = new Date(now + 86_400_000);
        next.setHours(hh, mm, 0, 0);
        while (!action.input.recurrence.days.includes(next.getDay())) next = new Date(next.getTime() + 86_400_000);
        recurrencePlan = {
          id: 'rec-' + state.seq++,
          deliveryId: id,
          days: action.input.recurrence.days,
          time: action.input.recurrence.time,
          active: true,
          nextOccurrence: next.getTime(),
          occurrences: [],
        };
      }
      const d: Delivery = {
        id,
        ref: 'RX-0' + String(state.seq).padStart(3, '0'),
        customerId: customer.id,
        createdAt: now,
        kind: action.input.kind,
        scheduledFor: action.input.scheduledFor,
        recurrenceId: recurrencePlan?.id ?? null,
        stops: action.input.stops,
        package: action.input.pkg,
        status: 'awaiting_payment',
        statusHistory: [{ status: 'awaiting_payment', at: now, actorId: customer.id, note: 'Request created — awaiting payment' }],
        riderId: null,
        offer: null,
        quote: q,
        payment: null,
        ledger: null,
        trackingToken: { token: generateToken(), expiresAt: now + state.config.policies.guestTokenHours * 3600_000, revoked: false },
        pickupCode: generateCode(),
        deliveryCode: generateCode(),
        verification: { pickupAttempts: 0, deliveryAttempts: 0, pickupLockedUntil: null, deliveryLockedUntil: null, pickupVerifiedAt: null, deliveryVerifiedAt: null },
        route: { points: routeFor(action.input.stops), distanceKm: q.distanceKm, etaMinutes: q.etaMinutes },
        riderProgress: 0,
        riderLocation: null,
        cancelReason: null,
        cancelledAt: null,
        cancelledBy: null,
        disputeId: null,
        safetyFlags: [],
        rating: null,
      };
      return {
        ...state,
        deliveries: [...state.deliveries, d],
        recurring: recurrencePlan ? [...state.recurring, recurrencePlan] : state.recurring,
        seq: state.seq,
        notifications: [notify(state, { userId: customer.id, category: 'delivery', title: 'Request created', body: `${d.ref} is awaiting payment. It will be matched to riders once paid.`, deliveryId: id }), ...state.notifications],
      };
    }

    case 'delivery/pay': {
      const d = state.deliveries.find((x) => x.id === action.deliveryId);
      const user = userOf(state, state.session.userId);
      if (!d || !user || d.status !== 'awaiting_payment') return state;
      // idempotency: one active payment attempt
      if (d.payment && d.payment.status === 'processing') return state;

      const amount = d.quote.total;
      let payment: Delivery['payment'];
      if (action.method === 'wallet') {
        if (user.walletBalance < amount) {
          return {
            ...state,
            notifications: [notify(state, { userId: user.id, category: 'payment', title: 'Wallet balance too low', body: `Top up your wallet or pay by card/transfer.`, deliveryId: d.id }), ...state.notifications],
          };
        }
        payment = { id: 'pay-' + d.id + '-' + state.seq++, deliveryId: d.id, method: 'wallet', amount, status: 'processing', gatewayRef: 'WAL-' + state.seq, idempotencyKey: 'idem-' + d.id + '-' + state.seq, events: [{ at: now, status: 'initiated', note: 'Wallet debit' }] };
      } else {
        payment = { id: 'pay-' + d.id + '-' + state.seq++, deliveryId: d.id, method: action.method, amount, status: 'processing', gatewayRef: (action.method === 'card' ? 'CARD-' : 'TRF-') + state.seq, idempotencyKey: 'idem-' + d.id + '-' + state.seq, events: [{ at: now, status: 'initiated', note: action.method === 'card' ? 'Card charge (demo gateway)' : 'Bank transfer — awaiting webhook' }] };
      }
      const t = guardTransition(d, 'payment_processing', {});
      if (!t.ok) return state;
      return {
        ...state,
        deliveries: state.deliveries.map((x) => (x.id === d.id ? { ...x, payment, status: 'payment_processing' as DeliveryStatus, statusHistory: [...x.statusHistory, { status: 'payment_processing' as DeliveryStatus, at: now, actorId: user.id }] } : x)),
      };
    }

    case 'delivery/offer': {
      const d = state.deliveries.find((x) => x.id === action.deliveryId);
      if (!d || !['awaiting_rider', 'offered_to_riders'].includes(d.status)) return state;
      // safety hours: do not offer runs that cannot complete before closure
      const w = evaluateServiceWindow(now, d.route.etaMinutes, state.config.hours);
      const alreadyLate = ['rider_assigned', 'rider_approaching_pickup', 'at_pickup', 'pickup_verification_pending', 'package_collected', 'in_transit', 'approaching_destination', 'delivery_verification_pending'].includes(d.status);
      if (alreadyLate) return state;
      if (!w.allowNewBooking) {
        return {
          ...state,
          deliveries: state.deliveries.map((x) => (x.id === d.id ? { ...x, safetyFlags: [...new Set([...x.safetyFlags, 'offer_blocked_after_hours'])] } : x)),
          notifications: [notify(state, { userId: d.customerId, category: 'safety', title: 'Matching paused until tomorrow', body: w.message, deliveryId: d.id }), ...state.notifications],
        };
      }
      const el = eligibleRiders(d, state.riders, state.config.policies).eligible.map((c) => c.rider.id);
      return {
        ...state,
        deliveries: state.deliveries.map((x) =>
          x.id === d.id
            ? { ...x, status: 'offered_to_riders', offer: { offeredTo: el, offeredAt: now, expiresAt: offerExpiry(now, 1), round: 1 }, statusHistory: [...x.statusHistory, { status: 'offered_to_riders' as DeliveryStatus, at: now, note: `Offered to ${el.length} eligible rider(s)`, actorId: 'system' }] }
            : x,
        ),
        notifications: el
          .map((rid) => riderOf(state, rid))
          .filter((r): r is RiderProfile => !!r && !!r.userId)
          .map((r) => notify(state, { userId: r.userId!, category: 'delivery', title: 'New delivery offer', body: `${d.ref}: ${d.stops[0].label} → ${d.stops[d.stops.length - 1].label}. Accept within 90 seconds.`, deliveryId: d.id })),
      };
    }

    case 'delivery/accept': {
      const d = state.deliveries.find((x) => x.id === action.deliveryId);
      if (!d || d.status !== 'offered_to_riders') return state; // single-assignment guard
      if (!d.offer?.offeredTo.includes(action.riderId)) return state;
      const t = guardTransition(d, 'rider_assigned', { riderAssigned: false, paymentSucceeded: true });
      if (!t.ok) return state;
      return {
        ...state,
        deliveries: state.deliveries.map((x) =>
          x.id === d.id
            ? { ...x, status: 'rider_assigned', riderId: action.riderId, offer: null, statusHistory: [...x.statusHistory, { status: 'rider_assigned' as DeliveryStatus, at: now, note: 'Rider accepted', actorId: action.riderId }] }
            : x,
        ),
        notifications: [notify(state, { userId: d.customerId, category: 'delivery', title: 'Rider found', body: `${riderName(state, action.riderId)} accepted ${d.ref}.`, deliveryId: d.id }), ...state.notifications],
      };
    }

    case 'delivery/decline': {
      const d = state.deliveries.find((x) => x.id === action.deliveryId);
      if (!d || !d.offer) return state;
      return { ...state, deliveries: state.deliveries.map((x) => (x.id === d.id ? { ...x, offer: { ...x.offer!, offeredTo: x.offer!.offeredTo.filter((r) => r !== action.riderId) } } : x)) };
    }

    case 'delivery/riderAction': {
      const d = state.deliveries.find((x) => x.id === action.deliveryId);
      if (!d) return state;
      // poor-network behaviour: safe status updates queue and sync on reconnect
      if (state.demo.offline) {
        const labels: Record<string, string> = {
          approach: 'Started approach to pickup',
          arrive_pickup: 'Arrived at pickup',
          request_pickup_code: 'Requested pickup code',
          collect: 'Collecting package',
          depart: 'Departed pickup',
          approach_dest: 'Approaching destination',
          arrive_dest: 'Arrived at destination',
          request_delivery_code: 'Requested delivery code',
        };
        return {
          ...state,
          networkQueue: [...state.networkQueue, { id: 'q-' + state.seq++, deliveryId: action.deliveryId, action: action.action, label: labels[action.action] ?? action.action, at: now }],
        };
      }
      const map: Record<string, DeliveryStatus> = {
        approach: 'rider_approaching_pickup',
        arrive_pickup: 'at_pickup',
        request_pickup_code: 'pickup_verification_pending',
        depart: 'in_transit',
        approach_dest: 'approaching_destination',
        arrive_dest: 'delivery_verification_pending',
        request_delivery_code: 'delivery_verification_pending',
      };
      const to = map[action.action];
      if (!to) return state;
      // pickup_verification_pending requires the sender to show the code — the
      // rider requests it; verification itself happens in verifyCode.
      const t = guardTransition(d, to, { riderAssigned: true, paymentSucceeded: true });
      if (!t.ok) {
        const riderUser = d.riderId ? riderOf(state, d.riderId)?.userId ?? null : null;
        return { ...state, notifications: riderUser ? [notify(state, { userId: riderUser, category: 'system', title: 'Action not allowed', body: t.reason ?? 'Invalid state change.', deliveryId: d.id })] : state.notifications };
      }
      return {
        ...state,
        deliveries: state.deliveries.map((x) => (x.id === d.id ? { ...x, status: to, statusHistory: [...x.statusHistory, { status: to, at: now, actorId: d.riderId ?? undefined }] } : x)),
      };
    }

    case 'delivery/verifyCode': {
      const d = state.deliveries.find((x) => x.id === action.deliveryId);
      if (!d) return state;
      const pol = state.config.policies;
      if (action.kind === 'pickup') {
        if (d.status !== 'pickup_verification_pending') return state;
        const res = checkPickupCode(action.code, d.pickupCode, d.verification, pol, now);
        let nd: Delivery | null = null;
        if (res.result === 'ok') {
          const t = guardTransition(d, 'package_collected', { pickupCodeVerified: true, riderAssigned: true });
          if (t.ok) {
            nd = { ...d, verification: res.state, status: 'package_collected', statusHistory: [...d.statusHistory, { status: 'package_collected' as DeliveryStatus, at: now, note: 'Pickup code verified', actorId: d.riderId ?? undefined }] };
          }
        } else {
          nd = { ...d, verification: res.state };
        }
        return { ...state, deliveries: state.deliveries.map((x) => (x.id === d.id ? nd! : x)) };
      } else {
        if (d.status !== 'delivery_verification_pending') return state;
        const res = checkDeliveryCode(action.code, d.deliveryCode, d.verification, pol, now);
        let nd: Delivery | null = null;
        if (res.result === 'ok') {
          const t = guardTransition(d, 'delivered', { deliveryCodeVerified: true, riderAssigned: true });
          if (t.ok) {
            nd = { ...d, verification: res.state, status: 'delivered', statusHistory: [...d.statusHistory, { status: 'delivered' as DeliveryStatus, at: now, note: 'Delivery code verified', actorId: d.riderId ?? undefined }] };
          }
        } else {
          nd = { ...d, verification: res.state };
        }
        return { ...state, deliveries: state.deliveries.map((x) => (x.id === d.id ? nd! : x)) };
      }
    }

    case 'delivery/cancel': {
      const d = state.deliveries.find((x) => x.id === action.deliveryId);
      if (!d) return state;
      if (!['awaiting_payment', 'awaiting_rider', 'offered_to_riders', 'rider_assigned', 'rider_approaching_pickup', 'at_pickup', 'pickup_verification_pending', 'package_collected', 'in_transit', 'approaching_destination', 'delivery_verification_pending', 'cancellation_requested'].includes(d.status)) return state;
      const stageIdx = cancellationStage(d.status);
      const stage = state.config.hours.cancellationFeeStages[stageIdx];
      const refund = Math.max(0, (d.payment?.amount ?? 0) - stage.fee);
      const safety = /(safety|emergency|unsafe)/i.test(action.reason);
      const finalFee = safety ? 0 : stage.fee;
      const finalRefund = Math.max(0, (d.payment?.amount ?? 0) - finalFee);
      const riders = state.riders.map((r) => (r.id === d.riderId && stage.refundRider && !safety ? { ...r, pendingEarnings: r.pendingEarnings + Math.round(finalFee * 0.7) } : r));
      const users = state.users.map((u) => (u.id === d.customerId && finalRefund > 0 ? { ...u, walletBalance: u.walletBalance + finalRefund } : u));
      const auditEntry = audit(state, action.by, 'delivery.cancel', d.ref, { reason: action.reason, before: d.status, after: 'cancelled' });
      return {
        ...state,
        users,
        riders,
        deliveries: state.deliveries.map((x) =>
          x.id === d.id
            ? {
                ...x,
                status: 'cancelled',
                offer: null,
                cancelReason: action.reason,
                cancelledAt: now,
                cancelledBy: action.by,
                statusHistory: [...x.statusHistory, { status: 'cancelled' as DeliveryStatus, at: now, note: `Cancelled by ${action.actorName}. Fee ₦${finalFee}. Refund ₦${finalRefund} to wallet.${safety ? ' Safety exception — no fee.' : ''}`, actorId: action.by }],
                ledger: x.ledger
                  ? {
                      ...x.ledger,
                      refunded: (x.payment?.amount ?? 0) - finalRefund,
                      settlement: 'settled',
                      settledAt: now,
                      adjustments: [...x.ledger.adjustments, { label: `Cancellation fee (stage: ${stage.label})`, amount: -finalFee }],
                    }
                  : x.ledger,
              }
            : x,
        ),
        auditLog: [...state.auditLog, auditEntry],
        notifications: [notify(state, { userId: d.customerId, category: 'delivery', title: 'Delivery cancelled', body: `${d.ref} cancelled. ${finalRefund > 0 ? `₦${finalRefund.toLocaleString()} refunded to your wallet.` : finalFee > 0 ? `A ₦${finalFee.toLocaleString()} fee applied per the cancellation policy.` : 'No fee applied.'}`, deliveryId: d.id }), ...state.notifications],
      };
    }

    case 'delivery/rate': {
      const d = state.deliveries.find((x) => x.id === action.deliveryId);
      if (!d || d.status !== 'delivered' || d.rating) return state;
      // update rider aggregates
      const riders = state.riders.map((r) => {
        if (r.id !== d.riderId) return r;
        const total = r.rating * r.completed + action.stars;
        const completed = r.completed + 1;
        return { ...r, completed, rating: Math.round((total / completed) * 100) / 100 };
      });
      return {
        ...state,
        riders,
        deliveries: state.deliveries.map((x) => (x.id === d.id ? { ...x, rating: { stars: action.stars, tags: action.tags, comment: action.comment, at: now } } : x)),
      };
    }

    case 'delivery/reportProblem': {
      const d = state.deliveries.find((x) => x.id === action.deliveryId);
      if (!d) return state;
      const id = 'c-' + state.seq++;
      const dispute: Dispute = {
        id,
        deliveryId: d.id,
        openedBy: action.by,
        reason: action.reason,
        description: action.description,
        status: 'open',
        events: [{ at: now, by: userOf(state, action.by)?.name ?? 'Receiver', note: 'Case opened.' }],
        openedAt: now,
      };
      const t = guardTransition(d, 'disputed', {});
      const canMarkDisputed = t.ok;
      return {
        ...state,
        disputes: [dispute, ...state.disputes],
        deliveries: state.deliveries.map((x) =>
          x.id === d.id
            ? canMarkDisputed
              ? { ...x, status: 'disputed', disputeId: id, statusHistory: [...x.statusHistory, { status: 'disputed' as DeliveryStatus, at: now, note: `Problem reported: ${action.reason}`, actorId: action.by }] }
              : { ...x, disputeId: id }
            : x,
        ),
        notifications: [notify(state, { userId: d.customerId, category: 'delivery', title: 'Case opened', body: `We received your report for ${d.ref}. Our team reviews verification records, photos and route history, then decides fairly.`, deliveryId: d.id }), ...state.notifications],
      };
    }

    case 'delivery/returnToSender': {
      const d = state.deliveries.find((x) => x.id === action.deliveryId);
      if (!d || !['delivery_verification_pending', 'return_required'].includes(d.status)) return state;
      return {
        ...state,
        deliveries: state.deliveries.map((x) =>
          x.id === d.id ? { ...x, status: 'return_required', safetyFlags: [...new Set([...x.safetyFlags, 'return_to_sender'])], statusHistory: [...x.statusHistory, { status: 'return_required' as DeliveryStatus, at: now, note: 'Receiver unavailable — return/redelivery per policy', actorId: d.riderId ?? undefined }] } : x,
        ),
        notifications: [notify(state, { userId: d.customerId, category: 'delivery', title: 'Return to sender started', body: `The receiver was unavailable for ${d.ref}. Review your options: redelivery or return.`, deliveryId: d.id }), ...state.notifications],
      };
    }

    /* ---- recurring ---- */
    case 'tracking/revoke':
    case 'tracking/rotate': {
      const d = state.deliveries.find((x) => x.id === action.deliveryId);
      if (!d) return state;
      const rotate = action.type === 'tracking/rotate';
      const user = state.users.find((u) => u.id === state.session.userId);
      return {
        ...state,
        deliveries: state.deliveries.map((x) =>
          x.id !== action.deliveryId
            ? x
            : {
                ...x,
                trackingToken: {
                  token: rotate ? 'tk-' + generateToken() : x.trackingToken.token,
                  expiresAt: rotate ? state.clock.epoch + state.config.policies.guestTokenHours * 3600_000 : x.trackingToken.expiresAt,
                  revoked: rotate ? false : true,
                },
              },
        ),
        notifications: [
          ...state.notifications,
          notify(state, { userId: d.customerId, category: 'system', title: rotate ? 'New tracking link issued' : 'Tracking link revoked', body: rotate ? `A fresh private link was issued for ${d.ref}. The old link no longer works.` : `The receiver link for ${d.ref} was revoked. It can no longer open the tracking page.`, deliveryId: d.id }),
        ],
        auditLog: [audit(state, user?.id ?? 'system', rotate ? 'tracking.rotate' : 'tracking.revoke', d.ref, { before: 'active link', after: rotate ? 'new token issued' : 'revoked' }), ...state.auditLog],
      };
    }
    case 'recurring/update': {
      let recurring = state.recurring.map((p) => (p.id === action.planId ? { ...p, ...action.patch } : p));
      const plan = recurring.find((p) => p.id === action.planId);
      if (plan && action.skipNext) {
        let next = new Date(plan.nextOccurrence + 86_400_000);
        while (!plan.days.includes(next.getDay())) next = new Date(next.getTime() + 86_400_000);
        recurring = recurring.map((p) => (p.id === plan.id ? { ...p, nextOccurrence: next.getTime(), occurrences: [...p.occurrences, { date: plan.nextOccurrence, deliveryId: null, skipped: true }] } : p));
      }
      return { ...state, recurring };
    }

    /* ---- rider ---- */
    case 'rider/submitApplication': {
      const user = userOf(state, state.session.userId);
      if (!user) return state;
      // duplicate application guard: one application per user
      if (state.applications.some((a) => a.userId === user.id && !['rejected', 'expired'].includes(a.status))) return state;
      const id = 'app-' + state.seq++;
      const app: RiderApplication = { ...action.app, id, status: 'submitted', submittedAt: now, reviewNotes: [] };
      return {
        ...state,
        applications: [...state.applications, app],
        users: state.users.map((u) => (u.id === user.id ? { ...u, role: 'customer' } : u)),
        notifications: [notify(state, { userId: user.id, category: 'account', title: 'Application submitted', body: 'Your rider application is now under manual review. We check your matriculation number, student ID and documents. You cannot accept deliveries until approved.' }), ...state.notifications],
      };
    }

    case 'rider/availability': {
      return { ...state, riders: state.riders.map((r) => (r.id === action.riderId ? { ...r, isAvailable: action.available, location: r.location ?? { x: 250, y: 250 }, locationUpdatedAt: action.available ? now : r.locationUpdatedAt } : r)) };
    }

    case 'rider/sos': {
      const id = 'i-' + state.seq++;
      const incident: Incident = {
        id,
        deliveryId: action.deliveryId,
        riderId: action.riderId,
        kind: action.kind,
        note: action.note,
        status: 'open',
        events: [{ at: now, by: riderName(state, action.riderId), note: 'Emergency/incident report submitted from the rider app.' }],
        openedAt: now,
        resolvedAt: null,
      };
      // safety pause: no automatic penalty — flag, don't punish
      const deliveries = state.deliveries.map((d) => (d.id === action.deliveryId ? { ...d, safetyFlags: [...new Set([...d.safetyFlags, 'rider_safety_pause'])] } : d));
      return {
        ...state,
        incidents: [incident, ...state.incidents],
        deliveries,
        notifications: [
          notify(state, { userId: 'u-admin', category: 'safety', title: 'Rider incident reported', body: `${riderName(state, action.riderId)} reported: ${action.kind}. Case ${id} created. Priority review required.` }),
          notify(state, { userId: riderOf(state, action.riderId)?.userId ?? null, category: 'safety', title: 'Help is on the case', body: 'Your report was recorded. If you are in immediate danger, contact local emergency services. Your delivery is paused with no penalty.' }),
          ...state.notifications,
        ],
      };
    }

    case 'rider/payoutRequest': {
      const r = riderOf(state, action.riderId);
      if (!r) return state;
      if (action.amount < state.config.policies.payoutMinAmount) return state;
      if (action.amount > r.availableEarnings) return state;
      const p: Payout = { id: 'po-' + state.seq++, riderId: r.id, amount: action.amount, status: 'requested', requestedAt: now, processedAt: null, batchId: null };
      return {
        ...state,
        payouts: [p, ...state.payouts],
        riders: state.riders.map((x) => (x.id === r.id ? { ...x, availableEarnings: x.availableEarnings - action.amount } : x)),
        notifications: [notify(state, { userId: r.userId, category: 'payment', title: 'Payout requested', body: `₦${action.amount.toLocaleString()} payout requested. Payouts run after finance reconciliation and fraud checks.` }), ...state.notifications],
      };
    }

    /* ---- admin (role-checked, audited) ---- */
    case 'admin/reviewApplication': {
      const actor = userOf(state, state.session.userId);
      if (!actor || actor.role !== 'admin') return state;
      const app = state.applications.find((a) => a.id === action.applicationId);
      if (!app || !['submitted', 'under_review', 'info_required', 'approved'].includes(app.status)) return state;
      const updated: RiderApplication = {
        ...app,
        status: action.decision,
        reviewNotes: [...app.reviewNotes, { at: now, by: actor.name, note: action.reason, decision: action.decision }],
      };
      let riders = state.riders;
      if (action.decision === 'approved' && !riders.some((r) => r.applicationId === app.id)) {
        const caps = { foot: { kg: 5, liters: 20 }, bicycle: { kg: 12, liters: 40 }, motorcycle: { kg: 25, liters: 90 } }[app.transport];
        riders = [
          ...riders,
          {
            id: 'r-' + state.seq++,
            userId: app.userId,
            applicationId: app.id,
            transport: app.transport,
            capacityKg: caps.kg,
            capacityLiters: caps.liters,
            zoneId: app.zoneId,
            isAvailable: false,
            simulated: false,
            workingHours: [{ start: '09:00', end: '18:00' }],
            rating: 5,
            completed: 0,
            onTimeRate: 1,
            pendingEarnings: 0,
            availableEarnings: 0,
            location: null,
            locationUpdatedAt: null,
          },
        ];
      }
      if (action.decision === 'suspended') {
        riders = riders.map((r) => (r.applicationId === app.id ? { ...r, isAvailable: false } : r));
      }
      const targetUser = userOf(state, app.userId);
      return {
        ...state,
        applications: state.applications.map((a) => (a.id === app.id ? updated : a)),
        riders,
        auditLog: [...state.auditLog, audit(state, actor.id, 'rider_application.' + action.decision, `${app.id} (${app.fullName})`, { reason: action.reason, before: app.status, after: action.decision })],
        notifications: [
          notify(state, { userId: app.userId, category: 'account', title: `Application ${action.decision.replace('_', ' ')}`, body: action.decision === 'approved' ? 'Congratulations — your rider account is approved. Set your availability to start receiving offers.' : action.decision === 'info_required' ? `We need more information: ${action.reason}` : action.decision === 'rejected' ? `Your application was not approved: ${action.reason}` : 'Your rider account is suspended pending review.' }),
          ...state.notifications,
        ],
      };
    }

    case 'admin/updateConfig': {
      const actor = userOf(state, state.session.userId);
      if (!actor || actor.role !== 'admin') return state;
      const before = JSON.stringify({ pricing: state.config.pricing, hours: state.config.hours, policies: state.config.policies });
      const config: AppConfig = {
        ...state.config,
        pricing: { ...state.config.pricing, ...action.patch.pricing },
        hours: { ...state.config.hours, ...action.patch.hours },
        policies: { ...state.config.policies, ...action.patch.policies },
        version: state.config.version + 1,
        updatedAt: now,
      };
      return {
        ...state,
        config,
        auditLog: [...state.auditLog, audit(state, actor.id, 'config.update', 'app-config v' + config.version, { reason: action.reason, before: 'v' + (config.version - 1), after: 'v' + config.version })],
      };
    }

    case 'admin/zoneActive': {
      const actor = userOf(state, state.session.userId);
      if (!actor || actor.role !== 'admin') return state;
      return {
        ...state,
        config: { ...state.config, zonesActive: { ...state.config.zonesActive, [action.zoneId]: action.active } },
        auditLog: [...state.auditLog, audit(state, actor.id, 'zone.' + (action.active ? 'activate' : 'suspend'), action.zoneId, { reason: action.reason })],
      };
    }

    case 'admin/resolveDispute': {
      const actor = userOf(state, state.session.userId);
      if (!actor || (actor.role !== 'admin' && actor.role !== 'finance')) return state;
      const c = state.disputes.find((x) => x.id === action.caseId);
      if (!c || c.status === 'resolved') return state;
      const d = state.deliveries.find((x) => x.id === c.deliveryId);
      let users = state.users;
      let deliveries = state.deliveries;
      if (action.refundAmount > 0 && d) {
        users = users.map((u) => (u.id === d.customerId ? { ...u, walletBalance: u.walletBalance + action.refundAmount } : u));
        deliveries = deliveries.map((x) => {
          if (x.id !== d.id || !x.ledger) return x;
          const split = splitLedger(action.refundAmount, state.config.pricing, []);
          const riderPortion = action.fromRiderShare ? Math.min(split.riderNet, Math.max(0, x.ledger.riderNet)) : 0;
          const platformPortion = action.refundAmount - riderPortion;
          return {
            ...x,
            ledger: {
              ...x.ledger,
              refunded: x.ledger.refunded + action.refundAmount,
              riderNet: x.ledger.riderNet - riderPortion,
              settlement: 'pending',
              adjustments: [...x.ledger.adjustments, { label: `Dispute ${c.id} refund (rider share ₦${riderPortion}, platform share ₦${platformPortion})`, amount: -platformPortion }],
            },
          };
        });
      }
      return {
        ...state,
        users,
        deliveries,
        disputes: state.disputes.map((x) =>
          x.id === c.id
            ? { ...x, status: 'resolved', resolution: { outcome: action.outcome, refundAmount: action.refundAmount, at: now, by: actor.name }, events: [...x.events, { at: now, by: actor.name, note: action.note }] }
            : x,
        ),
        auditLog: [...state.auditLog, audit(state, actor.id, 'dispute.resolve', c.id, { reason: action.outcome })],
        notifications: [notify(state, { userId: d?.customerId ?? null, category: 'delivery', title: 'Case resolved', body: `${d?.ref ?? 'Your delivery'}: ${action.outcome}.${action.refundAmount > 0 ? ` ₦${action.refundAmount.toLocaleString()} refunded to your wallet.` : ''}`, deliveryId: d?.id })].filter((n): n is Notification => !!n.userId).concat(state.notifications),
      };
    }

    case 'admin/resolveIncident': {
      const actor = userOf(state, state.session.userId);
      if (!actor || actor.role !== 'admin') return state;
      return {
        ...state,
        incidents: state.incidents.map((x) => (x.id === action.incidentId ? { ...x, status: 'resolved', resolvedAt: now, events: [...x.events, { at: now, by: actor.name, note: action.note }] } : x)),
        auditLog: [...state.auditLog, audit(state, actor.id, 'incident.resolve', action.incidentId, { reason: action.note })],
      };
    }

    case 'admin/settlementRun': {
      const actor = userOf(state, state.session.userId);
      if (!actor || actor.role !== 'finance') return state;
      const ready = state.deliveries.filter((d) => d.ledger?.settlement === 'ready' && d.riderId);
      if (!ready.length) return state;
      const batch: SettlementBatch = {
        id: 'sb-' + state.seq++,
        createdById: actor.id,
        createdAt: now,
        ledgerIds: ready.map((d) => d.id),
        amount: ready.reduce((a, d) => a + (d.ledger!.riderNet - d.ledger!.refunded), 0),
        status: 'awaiting_approval',
        approvedById: null,
      };
      return {
        ...state,
        batches: [batch, ...state.batches],
        deliveries: state.deliveries.map((d) => (d.ledger?.settlement === 'ready' && d.riderId ? { ...d, ledger: { ...d.ledger!, settlement: 'settled', settledAt: now, payoutId: batch.id } } : d)),
        auditLog: [...state.auditLog, audit(state, actor.id, 'settlement.run', batch.id, { reason: `${ready.length} ledger rows, ₦${batch.amount.toLocaleString()}` })],
        notifications: [notify(state, { userId: 'u-admin', category: 'payment', title: 'Settlement awaits approval', body: `Batch ${batch.id}: ₦${batch.amount.toLocaleString()} across ${ready.length} deliveries. Admin approval required (two-person rule).` }), ...state.notifications],
      };
    }

    case 'admin/approveSettlement': {
      const actor = userOf(state, state.session.userId);
      if (!actor || actor.role !== 'admin') return state;
      const b = state.batches.find((x) => x.id === action.batchId);
      if (!b || b.status !== 'awaiting_approval') return state;
      // credit rider available balances
      const riders = state.riders.map((r) => {
        const total = state.deliveries.filter((d) => d.riderId === r.id && d.ledger?.payoutId === b.id).reduce((a, d) => a + (d.ledger!.riderNet - d.ledger!.refunded), 0);
        return total ? { ...r, pendingEarnings: Math.max(0, r.pendingEarnings - total), availableEarnings: r.availableEarnings + total } : r;
      });
      return {
        ...state,
        riders,
        batches: state.batches.map((x) => (x.id === b.id ? { ...x, status: 'approved', approvedById: actor.id } : x)),
        auditLog: [...state.auditLog, audit(state, actor.id, 'settlement.approve', b.id, { reason: 'Two-person rule satisfied', before: 'awaiting_approval', after: 'approved' })],
      };
    }

    case 'admin/rejectSettlement': {
      const actor = userOf(state, state.session.userId);
      if (!actor || actor.role !== 'admin') return state;
      const b = state.batches.find((x) => x.id === action.batchId);
      if (!b || b.status !== 'awaiting_approval') return state;
      return {
        ...state,
        batches: state.batches.map((x) => (x.id === b.id ? { ...x, status: 'rejected' } : x)),
        deliveries: state.deliveries.map((d) => (d.ledger?.payoutId === b.id ? { ...d, ledger: { ...d.ledger!, settlement: 'ready', settledAt: null, payoutId: null } } : d)),
        auditLog: [...state.auditLog, audit(state, actor.id, 'settlement.reject', b.id, { reason: action.reason })],
      };
    }

    /* ---- misc ---- */
    case 'notifications/read':
      return { ...state, notifications: state.notifications.map((n) => (action.ids.includes(n.id) ? { ...n, read: true } : n)) };
    case 'demo/toggle':
      return { ...state, demo: { ...state.demo, [action.key]: !state.demo[action.key] } };
    case 'demo/reconnect': {
      // flush queued rider updates in order
      let s = { ...state, demo: { ...state.demo, offline: false }, networkQueue: [] as QueuedUpdate[] };
      for (const q of state.networkQueue) {
        s = reducer(s, { type: 'delivery/riderAction', deliveryId: q.deliveryId, action: q.action as never });
      }
      return s;
    }
    case 'app/reset':
      return init(undefined);
    default:
      return state;
  }
}

function riderName(state: AppState, riderId: string): string {
  const r = state.riders.find((x) => x.id === riderId);
  if (!r) return 'Rider';
  if (r.userId) return userOf(state, r.userId)?.name ?? 'Rider';
  const names: Record<string, string> = { 'r-kofi': 'Kofi M.', 'r-ibrahim': 'Ibrahim S.', 'r-blessing': 'Blessing A.' };
  return names[r.id] ?? 'Rider';
}

/* ---- context ---------------------------------------------------------------- */

const StateCtx = createContext<AppState>(null!);
const DispatchCtx = createContext<React.Dispatch<Action>>(null!);

export function RootXProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => init(load()));
  const stateRef = useRef(state);
  stateRef.current = state;

  // persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full — ignore in prototype */
    }
  }, [state]);

  // simulation heartbeat
  useEffect(() => {
    const t = setInterval(() => dispatch({ type: 'tick' }), 1000);
    return () => clearInterval(t);
  }, []);

  const stateValue = useMemo(() => state, [state]);
  return (
    <StateCtx.Provider value={stateValue}>
      <DispatchCtx.Provider value={dispatch}>{children}</DispatchCtx.Provider>
    </StateCtx.Provider>
  );
}

export function useRootX() {
  return useContext(StateCtx);
}
export function useDispatchRootX() {
  return useContext(DispatchCtx);
}

/* ---- derived selectors ------------------------------------------------------- */

export function activeZones(state: AppState) {
  return ALL_ZONES.filter((z) => state.config.zonesActive[z.id] !== false && z.active);
}

export function myDeliveries(state: AppState, userId: string) {
  return state.deliveries.filter((d) => d.customerId === userId).sort((a, b) => b.createdAt - a.createdAt);
}

export function deliveryByToken(state: AppState, token: string) {
  const d = state.deliveries.find((x) => x.trackingToken.token === token);
  if (!d || d.trackingToken.revoked || state.clock.epoch > d.trackingToken.expiresAt) return null;
  return d;
}

export function currentUser(state: AppState) {
  return state.session.userId ? userOf(state, state.session.userId) : undefined;
}

export function myRider(state: AppState) {
  const u = currentUser(state);
  return u ? state.riders.find((r) => r.userId === u.id) : undefined;
}

export function serviceWindowNow(state: AppState, etaMinutes = 20) {
  return evaluateServiceWindow(state.clock.epoch, etaMinutes, state.config.hours);
}

export function activeGuidanceNow(state: AppState) {
  return activeDeliveryGuidance(state.clock.epoch, state.config.hours);
}

export function unreadCount(state: AppState, userId: string) {
  return state.notifications.filter((n) => !n.read && (n.userId === userId || n.userId === null)).length;
}

export function locationIsStale(loc: { updatedAt: number } | null, now: number): boolean {
  if (!loc) return true;
  return now - loc.updatedAt > 60_000;
}
