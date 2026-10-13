# 13 — Security, Privacy and Threat Assessment

Scope: ROOT-X v1 (web + API + admin). Method: STRIDE-mapped threat table, controls, and residual risk. This is an engineering self-assessment — **independent penetration testing and legal review are required before any public launch** (tracked in `docs/19` U-3/U-4 and `docs/20`).

## 1. Assets

| Asset | Sensitivity |
|---|---|
| Rider identity documents (student IDs) | High — PII, verification-critical |
| Phone numbers, names, locations | High — personal data |
| Pickup/delivery codes | Medium — time-boxed secrets |
| Tracking tokens | Medium — capability URLs |
| Payment records / ledgers | High — financial integrity |
| Audit log | High — oversight integrity |
| Config (pricing/commission) | Medium — business integrity |

## 2. Threat model (STRIDE) and controls

| # | Threat | STRIDE | Control (layer) | Residual risk |
|---|---|---|---|---|
| T1 | Attacker books outside approved zones by tampering with client coords | Tampering | Server-side `point_zone()` + rules eligibility; zone data server-only; quote refusal | Low |
| T2 | Forged "payment succeeded" from client | Spoofing/Tampering | Only signature-verified webhooks mutate payment state; idempotency keys | Low |
| T3 | OTP brute force / SMS pumping | Spoofing | 5-attempt lockout, per-phone rate limits, identical responses for unknown phones, spend caps | Medium (SMS cost) — monitor |
| T4 | Pickup/delivery code brute force by fake rider | Spoofing | Per-code counters + 10-min lockout; codes only shown to sender/receiver; every attempt audited | Low |
| T5 | Tracking link enumeration/guessing | Spoofing/Info | 128-bit tokens stored hashed; expiry; revocation; rotation; rate limits | Very low |
| T6 | Stalker abuses guest link after delivery | Info/Elevation | Links die on delivery-completion grace, expiry, revocation; guest view shows no addresses/phones | Low |
| T7 | Malicious insider (admin) edits ledger/audit | Tampering/Elevation | DB append-only REVOKEs; two-person settlement; audit covers admins; DBA change control | Medium — needs ops discipline |
| T8 | Finance single-handedly pays out | Elevation | Proposer≠approver enforced in API **and** DB CHECK | Low |
| T9 | Rider impersonation (approved rider's account stolen) | Spoofing | OTP lockouts, device session rotation, SOS + anomaly flags; payout account change requires re-verification | Medium |
| T10 | Duplicate rider accounts (one student, many phones) | Repudiation | Unique matric number; document cross-check; review notes | Medium — human review quality |
| T11 | Unapproved applicant appears eligible | Elevation | Rider profiles exist only via application approval; matching checks profile existence; tested | Low |
| T12 | SQL/NoSQL injection | Tampering | Parameterized queries only; ORM; input validation at gateway | Low |
| T13 | XSS via package descriptions/names | Tampering | React escaping; no `dangerouslySetInnerHTML`; CSP | Low |
| T14 | IDOR — read another user's delivery | Info | Resource ownership guards on every route; UUIDs unguessable; tests | Low |
| T15 | Location history mining | Info | Active-run-only sharing; 7-day retention; aggregates only after; access audited | Low |
| T16 | Fake SOS / report abuse (against a rider) | DoS/Repudiation | Incidents require human resolution with audited notes; false-report patterns reviewed; no auto-penalty (C-6) | Medium |
| T17 | Denial of wallet service (race on balance) | Tampering | DB row locking; integer math; idempotent debits | Low |
| T18 | Replay of old webhook events | Tampering | Idempotency keys unique; event timestamps checked | Low |
| T19 | Secrets leakage via repo | Info | No secrets in git; secret manager; scanning in CI; webhook secret rotation | Low |
| T20 | Stale data presented as live (safety) | Tampering | Freshness contract in §C-8: `stale` flag + age rendering; tests | Low |
| T21 | Unsafe item smuggling (prohibited list) | Repudiation | Sender declaration + rider right-of-refusal + report flow + account action; prohibited list is policy data | Medium — accepted (human in loop) |
| T22 | After-dark run forced through | Safety | 6 PM/9 PM rules server-enforced; offer blocking; emergency always on (C-3); tested | Low |

## 3. Secure development lifecycle

- **Rules-as-code:** all business rules in the tested rules layer; PRs touching rules require a test.
- **CI gates:** typecheck, lint, unit + journey tests (54), DB migrations dry-run, secret scanning, dependency audit (`npm audit`/`pip-audit` class tools) on every PR.
- **Code review:** two reviewers for money/auth/geo paths.
- **Pre-launch:** independent penetration test; fixes re-tested; report retained.
- **Disclosure:** security contact + coordinated disclosure policy page; bug bounty considered post-pilot.

## 4. Application security controls (production)

- HTTPS-only (HSTS), TLS 1.2+; secure/HttpOnly/SameSite cookies for web session bootstrap; JWTs in memory.
- CSP: `default-src 'self'`; map tiles from allow-listed hosts; no inline scripts.
- Rate limits and request-size caps at the gateway; WAF in front of admin routes.
- Object storage: photos/ID docs private buckets, short-lived signed URLs, admin-only for ID docs, anti-virus scan on upload.
- Logging: structured, no PII in logs (phones masked, no location payloads), 90-day hot retention.
- Dependency policy: lockfiles, automated updates, no postinstall scripts without review.

## 5. Privacy (NDPR-aligned; counsel review pending — `docs/19` U-4)

| Principle | Implementation |
|---|---|
| Lawful basis | Contract (service delivery) + consent (notifications, location sharing) |
| Minimisation | Guest pages carry no personal data; location only during active runs; documents only for verification |
| Purpose limitation | Location for delivery tracking only; never marketing; sharing limited to run participants |
| Retention | See `docs/08` §4 table (docs 90 days post-decision, location 7 days, payments 6 years) |
| Subject rights | In-app access/export; erasure except financial records (retention duty) and fraud holds; response SLA 30 days |
| Data residency | Nigeria/EU hosting options evaluated at deployment; sub-processors listed in privacy notice |
| Children | 16+ assumed for university students; age signal at registration |
| DPIA | Required before pilot — camera/document processing and location tracking are higher-risk processing |

## 6. Accessibility (C-9)

- WCAG 2.1 AA target: keyboard-complete flows, visible focus, labelled controls, AA contrast tokens (done in the design system), screen-reader landmarks.
- Pre-pilot audit with assistive-tech users; issues tracked as launch blockers (P1) or fast-follow (P2) — see `docs/20`.

## 7. Incident response summary

Full runbook in `docs/17`. Security incidents: detect → contain (session revocation, feature freeze) → eradicate → recover → post-mortem with audit-log preservation. Safety incidents (people) take priority over security incidents (systems) when concurrent — see `docs/14`.

## 8. Residual risks accepted for pilot

1. SMS OTP dependency (cost/pump) — mitigate with caps, alerting; add TOTP for riders later.
2. Human review quality for rider applications — mitigate with checklists + spot audits.
3. Single-region hosting — accepted for pilot; DR plan in `docs/17`.
