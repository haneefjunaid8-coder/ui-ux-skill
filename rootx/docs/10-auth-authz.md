# 10 — Authentication and Authorization Design

## 1. Principles

1. **Phone-first identity** — students don't need another password; OTP with lockouts.
2. **Roles are server-side facts** — the UI hides nothing that the API doesn't also block (C-7).
3. **Privileged accounts are second-factor gated** — admins/finance always MFA.
4. **Guests are zero-knowledge** — a token sees one delivery, nothing else.
5. **Every privileged action is attributable** — audit log with actor, reason, before/after.

## 2. Identity model

```
UserAccount ──role── customer | rider | admin | finance | security
   │ phone (unique — one account per person)
   ├── customer → may also be a rider (separate verified profile)
   └── role changes: admin-only, audit-logged, never self-service
```

- **One phone = one account** (DB unique). A rider is a customer whose *rider application* was approved — not a different login. The rider profile is created only by approval (C-1).
- **Role separation inside staff:** finance proposes money actions, admin approves them, security resolves incidents. No super-user in v1; break-glass procedure in `docs/17`.

## 3. Authentication flows

### 3.1 Customer / rider login
```
POST /auth/otp/request  { phone }
  → rate-limited (5/hour/phone), response identical whether or not the phone exists
  → code hashed server-side, 10-min expiry, 5-attempt lockout (10 min)
POST /auth/otp/verify   { code }
  → short-lived access JWT (15 min) + rotating refresh token (30 days, "remember me" optional)
```

### 3.2 Admin / finance / security login
Same OTP step, then a **mandatory second factor** (TOTP in v1): the OTP verify response returns `mfa_required` with no tokens until `/auth/mfa/verify` succeeds. Session tokens for staff carry a `staff` claim with the exact role.

### 3.3 Guest
No authentication. A tracking token (128-bit, URL-safe, stored **hashed**) grants read-only access to exactly one delivery's guest view until expiry (48 h default) or revocation. Rotation invalidates the previous token atomically.

### 3.4 Token hygiene
- Access JWTs: 15 min, audience-scoped (`api`), include `sub`, `role`, `zone`, `staff?`, `sid`.
- Refresh tokens: hashed at rest, rotated on every use, revoked on logout; reuse of a rotated refresh token revokes the whole session family (theft signal).
- All sessions listed in `sessions`; staff sessions expire after 8 h idle.

## 4. Authorization model

### 4.1 Enforcement layers
1. **Route guard** (API middleware): role required per endpoint group.
2. **Resource guard** (service layer): ownership — a sender reads only their deliveries; a rider only runs assigned to them.
3. **Rules layer** (the shared engine): state-machine guards, safety hours, lockouts, money rules. Even a valid session cannot push a delivery through an illegal transition.
4. **Database constraints**: two-person settlement CHECK, ledger invariant CHECK, append-only REVOKEs — defence in depth.

### 4.2 Permission matrix
See `docs/03` §2 — the matrix is normative for the API routes in `docs/09`.

### 4.3 Least-privilege specifics
- Finance **cannot**: approve settlements (their own or others' — proposer≠approver enforced in DB), manage riders/zones, view student ID documents.
- Security **cannot**: touch money or pricing; resolves incidents only.
- Admins **cannot**: see raw payment credentials (tokens never pass through ROOT-X), or edit audit rows (nobody can).
- Riders **cannot**: see a sender's phone in cleartext (masked in-app; production: proxied calls), or receive offers outside eligibility rules.

## 5. Anti-abuse (C-1, C-4, C-6)

| Threat | Control |
|---|---|
| Duplicate rider accounts (same student, 2 phones) | Matric-number normalization + unique index; documents cross-checked at review; duplicate applications rejected with note |
| Role bypass (customer escalates to admin) | Roles live only in the DB, changed by admin action, audit-logged; JWT claims signed server-side; no client-sent roles |
| OTP brute force | 5-attempt lockout per challenge + rate limit per phone |
| Pickup/delivery code brute force | Per-code attempt counters, 5 misses → 10-min lockout, every attempt in `verification_attempts` |
| Tracking link guessing/enumeration | 128-bit tokens, stored hashed, unguessable, rate-limited, expiry + revocation |
| Stolen staff session | MFA, 8 h idle expiry, refresh rotation reuse-detection |
| Privilege creep | Quarterly access review procedure (`docs/18`); role changes audited |

## 6. Suspension and appeals (C-6)

Suspension is a **human** action (admin), always with reason and audit entry; the subject gets a notification and an in-app appeal path that opens a case. Automated systems may only apply *proportionate temporary safeguards* pending review — e.g., pausing new offers to a rider after repeated code lockouts — and every such safeguard auto-expires and is listed for review. Safety-motivated pauses/cancellations never feed any penalty (C-6, tested).

## 7. Prototype parity

The prototype implements: OTP flow with lockout, MFA gate for staff roles, role-gated admin routes, resource guards (my-deliveries, my-rider), guest token expiry/revocation/rotation, audit logging on privileged actions, and the state-machine guards. Production adds: real SMS/TOTP providers, JWT infrastructure, and the DB-level constraints (already specified in `database/`).
