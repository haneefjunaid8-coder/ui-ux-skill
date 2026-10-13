import type { VerificationState, Policies } from './types';

/* ============================================================================
   ROOT-X pickup & delivery verification.
   ----------------------------------------------------------------------------
   Codes are generated server-side, shown only to the entitled party (sender
   for pickup, receiver for delivery), checked with attempt limiting and
   lockout, and every verification event is recorded with a timestamp.
   ========================================================================== */

export type CodeCheck = 'ok' | 'wrong' | 'locked';

export function generateCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function generateToken(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 24; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export function checkPickupCode(
  code: string,
  expected: string,
  state: VerificationState,
  policies: Policies,
  now: number,
): { result: CodeCheck; state: VerificationState } {
  if (state.pickupLockedUntil && now < state.pickupLockedUntil) return { result: 'locked', state };
  if (code === expected) {
    return {
      result: 'ok',
      state: { ...state, pickupVerifiedAt: now, pickupAttempts: 0, pickupLockedUntil: null },
    };
  }
  const attempts = state.pickupAttempts + 1;
  if (attempts >= policies.otpLockoutAttempts) {
    return {
      result: 'locked',
      state: { ...state, pickupAttempts: attempts, pickupLockedUntil: now + policies.otpLockoutMinutes * 60_000 },
    };
  }
  return { result: 'wrong', state: { ...state, pickupAttempts: attempts } };
}

export function checkDeliveryCode(
  code: string,
  expected: string,
  state: VerificationState,
  policies: Policies,
  now: number,
): { result: CodeCheck; state: VerificationState } {
  if (state.deliveryLockedUntil && now < state.deliveryLockedUntil) return { result: 'locked', state };
  if (code === expected) {
    return {
      result: 'ok',
      state: { ...state, deliveryVerifiedAt: now, deliveryAttempts: 0, deliveryLockedUntil: null },
    };
  }
  const attempts = state.deliveryAttempts + 1;
  if (attempts >= policies.otpLockoutAttempts) {
    return {
      result: 'locked',
      state: { ...state, deliveryAttempts: attempts, deliveryLockedUntil: now + policies.otpLockoutMinutes * 60_000 },
    };
  }
  return { result: 'wrong', state: { ...state, deliveryAttempts: attempts } };
}

/** Remaining attempts message for UI. */
export function attemptsLeft(state: VerificationState, policies: Policies, kind: 'pickup' | 'delivery'): number {
  const used = kind === 'pickup' ? state.pickupAttempts : state.deliveryAttempts;
  return Math.max(0, policies.otpLockoutAttempts - used);
}
