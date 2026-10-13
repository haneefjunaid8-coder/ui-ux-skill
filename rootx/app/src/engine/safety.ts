import type { ServiceHoursConfig, DeliveryStatus } from './types';

/* ============================================================================
   ROOT-X safety-hours engine — the 6 PM warning and 9 PM closure.
   ----------------------------------------------------------------------------
   Core operating rule, not a decoration. Pure functions so the rule is
   testable and identical everywhere (booking UI, matching engine, rider app,
   admin). In production this runs server-side with per-zone overrides.
   ========================================================================== */

export type ServicePhase = 'closed' | 'cutoff' | 'warning' | 'open';

export interface ServiceWindow {
  phase: ServicePhase;
  /** May a NEW delivery be booked right now? */
  allowNewBooking: boolean;
  /** Minutes of day now (0..1439) for display */
  minutesOfDay: number;
  hour: number;
  minute: number;
  /** Human explanation — always shown to the user. */
  message: string;
  /** Remaining minutes before closure (can be negative after close). */
  minutesToClose: number;
}

export function minutesOfDay(date: Date | number): number {
  const d = typeof date === 'number' ? new Date(date) : date;
  return d.getHours() * 60 + d.getMinutes();
}

export function evaluateServiceWindow(
  now: Date | number,
  estimatedMinutes: number,
  config: ServiceHoursConfig,
): ServiceWindow {
  const mins = minutesOfDay(now);
  const close = config.closeHour * 60;
  const open = config.openHour * 60;
  const warning = config.warningHour * 60;
  const minutesToClose = close - mins;
  const hour = Math.floor(mins / 60);
  const minute = mins % 60;

  if (mins < open) {
    return {
      phase: 'closed',
      allowNewBooking: false,
      minutesOfDay: mins,
      hour,
      minute,
      minutesToClose,
      message: `Service opens at ${fmtHour(config.openHour)}. Bookings are not accepted yet.`,
    };
  }

  if (mins >= close) {
    return {
      phase: 'closed',
      allowNewBooking: false,
      minutesOfDay: mins,
      hour,
      minute,
      minutesToClose,
      message: `It is past ${fmtHour(config.closeHour)} — new delivery activity is closed for safety. Active deliveries continue to a safe resolution; emergency reporting stays available.`,
    };
  }

  const needed = estimatedMinutes + config.handlingBufferMin + config.bookingCutoffBufferMin;
  if (mins + needed > close) {
    return {
      phase: 'cutoff',
      allowNewBooking: false,
      minutesOfDay: mins,
      hour,
      minute,
      minutesToClose,
      message: `This delivery (about ${Math.round(estimatedMinutes + config.handlingBufferMin)} min plus handover) can no longer finish safely before the ${fmtHour(config.closeHour)} closure. Book it for tomorrow morning instead.`,
    };
  }

  if (mins >= warning) {
    return {
      phase: 'warning',
      allowNewBooking: true,
      minutesOfDay: mins,
      hour,
      minute,
      minutesToClose,
      message: `${fmtHour(config.warningHour)} safety notice: service closes at ${fmtHour(config.closeHour)}. Only start deliveries that can finish safely before then.`,
    };
  }

  return {
    phase: 'open',
    allowNewBooking: true,
    minutesOfDay: mins,
    hour,
    minute,
    minutesToClose,
    message: `Service is open until ${fmtHour(config.closeHour)}.`,
  };
}

/** Guidance for a delivery already in flight. */
export function activeDeliveryGuidance(now: Date | number, config: ServiceHoursConfig): {
  afterClose: boolean;
  inGrace: boolean;
  message: string;
} {
  const mins = minutesOfDay(now);
  const close = config.closeHour * 60;
  const graceEnd = close + config.activeGraceMin;
  if (mins < close) {
    const w = mins >= config.warningHour * 60;
    return {
      afterClose: false,
      inGrace: false,
      message: w
        ? `Evening notice: finish safely before ${fmtHour(config.closeHour)}. If you cannot, follow the safe-resolution steps.`
        : '',
    };
  }
  return {
    afterClose: true,
    inGrace: mins < graceEnd,
    message:
      mins < graceEnd
        ? `Past ${fmtHour(config.closeHour)}: complete the handover at hand, then stop accepting new work. If a package cannot be delivered safely, use Return to sender or contact support — never abandon a package.`
        : `Well past closing. Stop active work now, secure the package, and report the situation to support. Emergency help remains available.`,
  };
}

/** Scheduled slot validity (for scheduled/recurring bookings). */
export function scheduledSlotOk(scheduledFor: Date | number, etaMinutes: number, config: ServiceHoursConfig): { ok: boolean; reason?: string } {
  const d = typeof scheduledFor === 'number' ? new Date(scheduledFor) : scheduledFor;
  const start = d.getHours() * 60 + d.getMinutes();
  if (start < config.openHour * 60) return { ok: false, reason: `Slot is before opening (${fmtHour(config.openHour)}).` };
  if (start + etaMinutes + config.handlingBufferMin > config.closeHour * 60)
    return { ok: false, reason: `Slot cannot complete before the ${fmtHour(config.closeHour)} closure. Choose an earlier time.` };
  return { ok: true };
}

/** Should a warning notification fire exactly once when crossing 6 PM? */
export function crossedWarning(prevMinutes: number, nowMinutes: number, config: ServiceHoursConfig): boolean {
  const w = config.warningHour * 60;
  return prevMinutes < w && nowMinutes >= w;
}

export function crossedClose(prevMinutes: number, nowMinutes: number, config: ServiceHoursConfig): boolean {
  const c = config.closeHour * 60;
  return prevMinutes < c && nowMinutes >= c;
}

export function fmtHour(h: number): string {
  const hh = ((h + 11) % 12) + 1;
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${hh}:00 ${ap}`;
}

/** Statuses that count as "active on the road" for closure handling. */
export const ACTIVE_ON_ROAD: DeliveryStatus[] = [
  'rider_assigned',
  'rider_approaching_pickup',
  'at_pickup',
  'pickup_verification_pending',
  'package_collected',
  'in_transit',
  'approaching_destination',
  'delivery_verification_pending',
  'return_required',
];
