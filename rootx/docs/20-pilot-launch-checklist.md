# 20 — Pilot and Launch Checklist

Phase gates from the founding brief (§36/§37) mapped to concrete, checkable items. A gate passes only when every box in it is checked; date and sign-off recorded per gate.

## Gate 0 — Requirements and design (complete)

- [x] Requirements analysis: PRD (`docs/01`), user stories + acceptance criteria (`docs/02`), journeys + permission matrix (`docs/03`), IA (`docs/04`)
- [x] Wireframes → polished UI for every primary surface (`docs/05`, implemented in `rootx/app`)
- [x] Design system with editable tokens; no finalized brand (`docs/06`)
- [x] Assumptions/risks/unresolved register opened (`docs/19`)

## Gate 1 — Working prototype (complete)

- [x] All roles: customer, guest, rider, admin (ops/finance/security views)
- [x] All modes: single/multi-item, eligible bulk rules, immediate/scheduled/recurring, multi-pickup/multi-destination
- [x] Engine with the nine §38 constraints implemented and tested (54 tests, `docs/15`)
- [x] Honest-state UI: payment processing, stale location, offline, safety phases
- [x] Audit log, two-person settlement, dispute/safety workflows
- [x] `tsc` clean · `vite build` clean · vitest green · dev server runs

## Gate 2 — Production readiness (engineering)

- [ ] Database migrations applied to a clean staging DB; invariant CHECKs exercised (`database/`)
- [ ] API implemented against `api/openapi.yaml`; contract tests green
- [ ] Secrets in a secret store; scanning clean; dependency audit clean
- [ ] Load test: matching + tracking fan-out + 10k-ledger settlement run
- [ ] Backup + restore drill executed and timed (`docs/17`)
- [ ] Penetration test executed; P0/P1 findings closed (`docs/13`)
- [ ] Accessibility audit (WCAG 2.1 AA) on customer + rider flows; P1s closed
- [ ] Status page, alerting, on-call rotation live

## Gate 3 — Business and legal

- [ ] **U-1 decided:** commission % and price table signed off by founder (`docs/19`)
- [ ] **U-2 decided:** payment provider contract signed
- [ ] NDPR/legal review of ToS, Privacy Policy, prohibited-items policy (U-4)
- [ ] No-insurance language in ToS + in-app disclosures (A-7, U-10)
- [ ] Public copy reviewed against the prohibited-claims list (`docs/19` §6)
- [ ] Zone boundaries reviewed and frozen for pilot; campus liaison contact confirmed (A-10 — informal ok, no claims)
- [ ] Pricing config, safety hours, policies loaded via admin (no code)
- [ ] Finance process dry-run: reconciliation → propose → approve → payout (two-person, on staging then production with test amounts)

## Gate 4 — Pilot operations

- [ ] Pilot staff trained on `docs/18`; escalation tree printed
- [ ] Seed riders: 10–20 approved applications **before** opening demand
- [ ] Support channel + safety SLA monitoring live (SOS ≤ 5 min)
- [ ] Daily ops rhythm running (`docs/18` §2)
- [ ] Success metrics dashboard live (PRD §7 targets)
- [ ] Week-1 checkpoint: payment mix, delivery times, safety events, rider earnings vs U-1 assumptions
- [ ] Week-4 checkpoint: go/no-go for expansion (second township zone or next campus) using the multi-campus config path

## Gate 5 — Public launch (post-pilot)

- [ ] Pilot metrics met (PRD §7) for 2 consecutive weeks
- [ ] Pen-test re-run on the public surface; findings closed
- [ ] Legal sign-off stored; insurance decision (U-10) executed or explicitly declined
- [ ] Native shells decision (U-6) taken with push-reliability data
- [ ] Comms plan: on-campus ambassadors, no affiliation claims, expectation-setting on hours (no night service)
- [ ] Rollback plan rehearsed; incident runbook tabletop exercised with all staff

## Definitions of done for pilot

1. Zero reconciliation gap across every settlement batch.
2. 100 % of deliveries completed with verified codes.
3. Zero new bookings after the 9 PM cutoff.
4. Every safety incident resolved with an audited note within 24 h.
5. No automated penalty ever applied (hard invariant — weekly review).
