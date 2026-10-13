import { describe, expect, it } from 'vitest';
import { checkPickupCode, checkDeliveryCode, attemptsLeft, generateToken } from './verification';
import { POLICIES_DEFAULTS } from './config';
import type { VerificationState } from './types';

const fresh: VerificationState = {
  pickupAttempts: 0,
  deliveryAttempts: 0,
  pickupLockedUntil: null,
  deliveryLockedUntil: null,
  pickupVerifiedAt: null,
  deliveryVerifiedAt: null,
};

describe('pickup & delivery verification', () => {
  it('accepts the correct code and records the timestamp', () => {
    const { result, state } = checkPickupCode('4821', '4821', fresh, POLICIES_DEFAULTS, 1000);
    expect(result).toBe('ok');
    expect(state.pickupVerifiedAt).toBe(1000);
  });

  it('counts wrong attempts and locks after the configured limit', () => {
    let state = fresh;
    let last = 'wrong';
    for (let i = 0; i < POLICIES_DEFAULTS.otpLockoutAttempts; i++) {
      const r = checkPickupCode(last, '4821', state, POLICIES_DEFAULTS, 1000 + i);
      state = r.state;
      last = r.result;
    }
    expect(last).toBe('locked');
    expect(state.pickupLockedUntil).toBeGreaterThan(1000);
  });

  it('rejects even the correct code while locked', () => {
    const locked: VerificationState = { ...fresh, pickupLockedUntil: 5000, pickupAttempts: 5 };
    const r = checkPickupCode('4821', '4821', locked, POLICIES_DEFAULTS, 4000);
    expect(r.result).toBe('locked');
    // after the lock expires, the code works again
    const r2 = checkPickupCode('4821', '4821', locked, POLICIES_DEFAULTS, 6000);
    expect(r2.result).toBe('ok');
  });

  it('tracks delivery attempts independently of pickup', () => {
    const afterPickup: VerificationState = { ...fresh, pickupAttempts: 4, pickupVerifiedAt: 1 };
    const r = checkDeliveryCode('0000', '9999', afterPickup, POLICIES_DEFAULTS, 100);
    expect(r.result).toBe('wrong');
    expect(r.state.pickupAttempts).toBe(4);
    expect(r.state.deliveryAttempts).toBe(1);
  });

  it('reports remaining attempts for UI', () => {
    expect(attemptsLeft({ ...fresh, pickupAttempts: 2 }, POLICIES_DEFAULTS, 'pickup')).toBe(3);
  });

  it('generates unguessable tracking tokens', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateToken()));
    expect(tokens.size).toBe(200);
    expect([...tokens][0].length).toBeGreaterThanOrEqual(20);
  });
});
