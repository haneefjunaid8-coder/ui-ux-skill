# 19 — Assumptions, Risks and Unresolved Decisions

This is the honesty document. It records every material assumption the prototype embodies, the risks we carry, and the decisions that remain **explicitly open** — with owners and decision criteria. Per the founding brief: nothing here may be silently resolved by shipping code; changing a non-negotiable (§38) requires explicit founder approval.

## 1. Binding constraints (never weakened without approval)

C-1 verified student riders only · C-2 approved campus/township zones only · C-3 6 PM/9 PM safety hours · C-4 permission-aware location + revocable time-limited links + enforced verification codes · C-5 auditable/reconcilable money · C-6 no automated penalties, human review with appeal · C-7 server-side RBAC + audit logging · C-8 never stale-as-live, never unconfirmed-as-paid · C-9 privacy/accessibility/secure-dev/legal review in plan.

## 2. Assumptions (A-*) — believed true for the prototype; verify before production

| # | Assumption | Basis | Verification |
|---|---|---|---|
| A-1 | Students have smartphones with data and can install/use a PWA | University context | Pilot onboarding survey |
| A-2 | Brand: **palette resolved 2026-10-13** (Campus Neon dark identity — D-11); name + wordmark still placeholder | Founder instruction + decision | Wordmark exercise pre-launch |
| A-3 | One campus (Osogbo) + Oke-Baale township is the right pilot scope | Brief | Founder sign-off on pilot zone map |
| A-4 | Demand ≈ 30–50 runs/day at pilot | Analogy, not data | Week-2 pilot metrics |
| A-5 | Students will accept OTP-only auth | Common NG pattern | Conversion funnel |
| A-6 | Card/transfer/wallet covers payment needs (no cash) | Campus digital payment norms | Pilot payment mix |
| A-7 | **No insurance is offered**; high-value items only get extra verification, with explicit no-insurance disclosure | Founder prohibition | Written confirmation before any coverage claim |
| A-8 | Riders bring their own transport; capacity caps (5/12/25 kg) suffice | Campus reality | Rider feedback |
| A-9 | ~3–5 staff can operate pilot (1 ops, 1 finance-adjacent, founder) | Prototype tooling depth | Pilot staffing plan |
| A-10 | UNIOSUN authorities will engage on zone boundaries and safety liaison | Assumption only — **no partnership claimed** | Founder conversations (no public claims until written) |

## 3. Unresolved decisions (U-*) — tracked, with criteria

| # | Decision | Options on the table | Decision criteria | Default in code |
|---|---|---|---|---|
| U-1 | **Commission %** and final price table | prototype 15 %; alternatives 10–25 %; per-transport differentials | rider supply vs platform sustainability; competitor rates; pilot elasticity | 15 %, ₦600 base, ₦140/km — **clearly labelled demo values** |
| U-2 | Payment provider | Paystack-class vs Flutterwave-class vs bank direct | webhook reliability, transfer support, fees, settlement cadence, dispute tooling | none — provider-agnostic interface |
| U-3 | Pen-test vendor & timing | pre-pilot vs pre-public-launch | budget, launch date, risk appetite | scheduled pre-pilot (docs/20) |
| U-4 | Legal counsel scope | NDPR review only vs full ToS/Privacy/DSA review | cost, features shipped | NDPR review mandatory pre-pilot |
| U-5 | Map tile strategy | self-host PMTiles vs commercial OSM provider | cost, offline needs, ops burden | prototype ships **real Leaflet/OSM** (CARTO dark tiles, UNIOSUN Osogbo coordinates); zone polygons are schematic overlays (D-8) |
| U-6 | Native shells | PWA-only vs Capacitor vs React Native | push reliability, background location on iOS | PWA first, shells post-pilot |
| U-7 | Payout rails | provider transfers vs bank bulk payments | fees, rider bank coverage, speed | provider transfers assumed |
| U-8 | SMS provider | local aggregators vs cloud (Twilio-class) | delivery rates in Nigeria, cost | undecided |
| U-9 | RTL / non-English languages | English-only vs Yoruba fast-follow | pilot user mix | English only, structure ready |
| U-10 | Insurance partnership | none vs third-party rider accident cover | underwriter terms, cost | **none — no claims permitted** |

## 4. Risks (R-*) — likelihood × impact, with mitigations

| # | Risk | L×I | Mitigation |
|---|---|---|---|
| R-1 | No university agreement; asked to stop operating on campus | M×H | Zone polygons are data (removable in minutes); no affiliation claims anywhere; early informal engagement; township-first fallback |
| R-2 | Rider supply shortfall (studies > riding) | H×M | Flexible availability; multi-drop efficiency; waitlist + referral incentives (pricing TBD U-1) |
| R-3 | Safety incident involving a rider at night | M×H | C-3 hours enforced server-side; SOS; two-person resolution; campus liaison; insurance decision U-10 |
| R-4 | Payment fraud / chargebacks | M×H | webhook-only success; idempotency; reconciliation blocks settlement on mismatch (C-5) |
| R-5 | SMS OTP cost/pumping attacks | M×M | rate caps, lockouts, spend alerts, TOTP for riders later |
| R-6 | Data breach (ID documents worst case) | L×H | private buckets, signed URLs, encryption at rest, pen-test, NDPR breach plan (docs/17) |
| R-7 | Insider fraud | L×H | two-person money rule (DB-enforced), append-only audit, quarterly access reviews |
| R-8 | Wrong rider approval (fake student) | M×H | C-1 manual review checklist, duplicate matric detection, spot audits |
| R-9 | Prototype→production drift | M×M | rules layer is production code; parity check between `types.ts` and schema in CI (docs/08 §5) |
| R-10 | Poor network degrades trust | H×M | C-8 honesty contract (stale/offline states), queued actions, PWA caching |
| R-11 | Founder bandwidth (single owner) | H×M | docs/runbooks reduce bus-factor; pilot scope deliberately small |

## 5. Decisions already made (D-*) — with rationale, revisitable

| # | Decision | Rationale | Revisit when |
|---|---|---|---|
| D-1 | Rules-as-code shared layer (TS) | testable, one truth, prototype=production rules | never (foundational) |
| D-2 | Modular monolith first | team size; extract later mechanically | > 5k runs/day or team > 10 |
| D-3 | Postgres + PostGIS | ACID money + native geo | never |
| D-4 | PWA first | instant reach, zero store friction | push/location gaps prove material |
| D-5 | OSM over Google Maps | cost, control, open data | coverage proves inadequate |
| D-6 | Two-person settlement in DB CHECK | defence in depth | never |
| D-7 | No automated penalties, by architecture | C-6 is cultural + technical | never (foundational) |
| D-8 | Zone geometry schematic in prototype (basemap is real OSM/Leaflet since 2026-10-13) | testable geofencing without surveying infra | surveyed polygons land in PostGIS |
| D-9 | Integer kobo everywhere | money integrity | never |
| D-10 | Config-driven pricing/hours/zones | no-deploy policy changes (C-7 adjacent) | never |
| D-11 | Campus Neon dark identity app-wide (2026-10-13) | deliberate founder decision; extends the landing's language to the product (docs/06 §8) | rebrand exercise |
| D-12 | Real authoritative server (Fastify + SQLite) with SSE, sessions, per-viewer redaction; human-driven riders only | prototype must exercise the production trust model, not simulate it | production build-out |
| D-13 | OTP codes returned in the otpRequest response (shown in-app) | no SMS gateway in prototype (U-8); keeps the flow real: rate-limited, attempt-limited, redacted everywhere else | SMS provider lands |

## 6. Prohibited claims (standing reminder)

Until verified in writing, ROOT-X must not claim: UNIOSUN partnership, endorsement or affiliation; insurance coverage of any kind; legal/NDPR compliance (review pending); finalized commission/pricing; service beyond approved zones. All public copy is reviewed against this list before release (`docs/20` checklist).

## 7. Change log for this document

- v0.1 — initial register from the prototype build; U-1/U-2 flagged as the first two decisions the founder must make.
- v0.2 — 2026-10-13: dark identity decision recorded (D-11, A-2 palette half resolved); real server + real OSM map shipped (D-12, U-5/D-8 updated); OTP delivery channel documented (D-13, U-8 unchanged — no SMS yet).
