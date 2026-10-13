# 15 — Test Plan and Automated Tests

## 1. Test philosophy

- **Rules-as-code ⇒ tests-as-spec.** Every non-negotiable (C-1…C-9) is covered by at least one automated test in the rules layer.
- The **journey test** proves the cross-module flows end-to-end (booking → payment → matching → verification → settlement → dispute → incident → audit).
- UI tests cover critical rendering states; production adds contract tests against `api/openapi.yaml`.

## 2. Current automated suite (all green)

`cd rootx/app && npm test` — 8 files, 54 tests, ~2 s:

| File | Covers |
|---|---|
| `engine/stateMachine.test.ts` | transition table, guards (payment, codes, rider), cancellation/return/dispute branches, stage ordering |
| `engine/safety.test.ts` | 6 PM warning, 9 PM closure, ETA+buffer cutoff logic, emergency availability, fee-stage behaviour, safety-cancellation waiver |
| `engine/pricing.test.ts` | quote line items, minimum fare, size tiers, weight, fragile/food, extra stops, high value, validation verdicts, transport caps, rider-net split |
| `engine/matching.test.ts` | eligibility (zone, capacity, fragile floor, high-value rating floor, availability), rejection reasons, scoring order, single assignment |
| `engine/verification.test.ts` | pickup/delivery code check, attempt counting, lockout at policy limit, unlock after window |
| `engine/zones.test.ts` | unit→km scale, distances, point-in-polygon, zone-of-point, eligibility incl. inter-zone policy, deactivated zones |
| `engine/ledger.test.ts` | build/split, invariant hold/fail, refund accounting (rider share vs platform share), settlement transitions, reconcile |
| `engine/journey.test.ts` | full end-to-end: create→pay(webhook)→offer→assign→verify→deliver→ledger; two-person settlement incl. finance-blocked approval; dispute refund invariant both splits; SOS→resolution→audit, no auto-penalty; guest token revoke/rotate/expiry |

Mapping to §38 non-negotiables:

| Constraint | Tests |
|---|---|
| C-1 riders verified only | matching (no profile → not eligible); journey (application flow); store guards |
| C-2 zones only | zones, pricing (quote refusal), journey (create) |
| C-3 hours | safety, journey (cutoff), store tick tests |
| C-4 codes/links | verification, journey (lockout, revoke/rotate/expiry) |
| C-5 money | ledger, journey (invariant, two-person) |
| C-6 no auto-penalty | journey (SOS), stateMachine (safety cancellation) |
| C-7 admin audit | journey (audit actions), ledger |
| C-8 honesty | journey (payment never auto-succeeds), zones, safety |
| C-9 privacy/a11y | design-system tokens (manual audit pre-pilot) |

## 3. Manual test matrix (prototype → pilot)

| Area | Cases |
|---|---|
| Booking wizard | happy path each kind (immediate/scheduled/recurring); multi-stop; each rejection reason (weight, volume, value, zone, after-cutoff); photo/declaration required |
| Payments | card success; transfer delayed webhook; wallet insufficient; forced gateway failure (demo toggle); retry after failure |
| Rider flow | apply→approve→offer→accept→codes→deliver; decline offers; lockout recovery; SOS |
| Guest | open link; revoked link; expired link; rotated link; stale-location rendering |
| Admin | application decision (note required); zone toggle effects; pricing change effect on new quotes only; settlement propose/approve/reject (role blocks); dispute resolution both splits; incident resolution; audit completeness |
| Degradation | offline toggle; GPS-loss toggle (stale markers); reconnect; slow network (honest spinners) |
| Accessibility | keyboard-only booking; screen-reader on key pages; contrast spot checks; 200 % zoom |
| Devices | low-end Android (Chrome), iPhone Safari, desktop browsers |

## 4. Production test pyramid (planned)

1. **Unit** — rules layer (exists; ported as-is to the server).
2. **Contract** — API endpoints validated against `openapi.yaml`; webhook signature/idempotency tests.
3. **Integration** — services with real Postgres/Redis (migrations applied, invariant CHECKs exercised).
4. **E2E** — Playwright journeys on staging: the full customer+rider+admin three-session flow, including after-hours and payment-failure paths.
5. **Load** — matching worker, tracking WS fan-out, settlement run over 10k ledgers.
6. **Chaos** — webhook delay/replay, Redis loss (fail-closed offers), Postgres failover.

## 5. Quality gates

| Gate | Requirement |
|---|---|
| CI on PR | typecheck ✓, all tests ✓, migrations apply on clean DB ✓, secret scan ✓, dependency audit ✓ |
| Pre-merge | 2 reviews (money/auth/geo paths) |
| Pre-release | E2E green on staging, pen-test findings closed, rollback tested |
| Pilot monitoring | error budget, payment mismatch count = 0, safety SLA dashboards |

## 6. Bug triage

P0 money wrong / safety broken / data exposure → fix before any deploy.
P1 core journey broken → fix same day.
P2 degraded UX → next release.
Every P0/P1 gets a regression test before closure.
