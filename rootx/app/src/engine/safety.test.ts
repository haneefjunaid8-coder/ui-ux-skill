import { describe, expect, it } from 'vitest';
import { evaluateServiceWindow, activeDeliveryGuidance, scheduledSlotOk, crossedWarning, crossedClose } from './safety';
import { HOURS_DEFAULTS } from './config';

const at = (h: number, m = 0) => new Date(new Date().setHours(h, m, 0, 0));

describe('safety hours — 6 PM warning / 9 PM closure', () => {
  it('is open in the afternoon', () => {
    const w = evaluateServiceWindow(at(15), 20, HOURS_DEFAULTS);
    expect(w.phase).toBe('open');
    expect(w.allowNewBooking).toBe(true);
  });

  it('fires the warning phase at/after 6 PM but still allows short runs', () => {
    const w = evaluateServiceWindow(at(18, 5), 20, HOURS_DEFAULTS);
    expect(w.phase).toBe('warning');
    expect(w.allowNewBooking).toBe(true);
    expect(w.message).toContain('6:00 PM');
  });

  it('cuts off bookings that cannot finish before 9 PM', () => {
    // 8:20 PM + 20 min ETA + 15 handling + 45 cutoff buffer = past 9 PM
    const w = evaluateServiceWindow(at(20, 20), 20, HOURS_DEFAULTS);
    expect(w.phase).toBe('cutoff');
    expect(w.allowNewBooking).toBe(false);
  });

  it('allows a quick run at 7:40 PM but not a long one', () => {
    // 19:40 + 15 min ETA + 15 handling + 45 cutoff buffer = 20:55 ≤ 21:00 → OK
    expect(evaluateServiceWindow(at(19, 40), 15, HOURS_DEFAULTS).allowNewBooking).toBe(true);
    // 19:40 + 40 min ETA + buffers = 21:20 > 21:00 → blocked
    expect(evaluateServiceWindow(at(19, 40), 40, HOURS_DEFAULTS).allowNewBooking).toBe(false);
  });

  it('is closed at/after 9 PM — no new bookings, clear message', () => {
    const w = evaluateServiceWindow(at(21, 5), 10, HOURS_DEFAULTS);
    expect(w.phase).toBe('closed');
    expect(w.allowNewBooking).toBe(false);
    expect(w.message).toContain('9:00 PM');
  });

  it('is closed before opening', () => {
    expect(evaluateServiceWindow(at(6, 30), 15, HOURS_DEFAULTS).phase).toBe('closed');
  });

  it('guides active deliveries to safe resolution instead of abandoning them', () => {
    const g = activeDeliveryGuidance(at(21, 10), HOURS_DEFAULTS);
    expect(g.afterClose).toBe(true);
    expect(g.inGrace).toBe(true);
    expect(g.message).toContain('safe');
    const late = activeDeliveryGuidance(at(22, 30), HOURS_DEFAULTS);
    expect(late.inGrace).toBe(false);
    expect(late.message).toContain('Stop active work');
  });

  it('validates scheduled slots against the window', () => {
    expect(scheduledSlotOk(at(7, 30), 20, HOURS_DEFAULTS).ok).toBe(false); // before opening
    expect(scheduledSlotOk(at(20, 30), 30, HOURS_DEFAULTS).ok).toBe(false); // can't finish before close
    expect(scheduledSlotOk(at(14, 0), 30, HOURS_DEFAULTS).ok).toBe(true);
  });

  it('detects the exact minute crossings for broadcast notifications', () => {
    expect(crossedWarning(17 * 60 + 59, 18 * 60, HOURS_DEFAULTS)).toBe(true);
    expect(crossedWarning(18 * 60, 18 * 60 + 1, HOURS_DEFAULTS)).toBe(false);
    expect(crossedClose(20 * 60 + 59, 21 * 60, HOURS_DEFAULTS)).toBe(true);
    expect(crossedClose(12 * 60, 13 * 60, HOURS_DEFAULTS)).toBe(false);
  });
});
