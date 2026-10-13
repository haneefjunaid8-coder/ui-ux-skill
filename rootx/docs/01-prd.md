# 01 — Product Requirements Document (PRD)

**Product:** ROOT-X — campus delivery, logistics and student-rider platform
**Institution context:** Osun State University (UNIOSUN), Osogbo, Osun State, Nigeria
**Status:** Working prototype (this repository) + production specification
**Version:** 0.1 · Draft for founder and pilot review
**Related:** all documents in `docs/`; assumptions and unresolved decisions are tracked in `docs/19-assumptions-risks-decisions.md`.

---

## 1. Problem

UNIOSUN students move packages constantly — documents between faculty offices and hostels, market groceries from Oke-Baale to student housing, borrowed items between friends on and around campus, stock for small student businesses. Today this happens through informal, unaccountable channels:

- unvetted okada/keke riders with no verification, no insurance and no recourse;
- no proof of pickup or delivery, no accountability when items are lost or damaged;
- no safe option after dark, when most student-township movement happens;
- no work opportunity structured around a student's academic schedule.

## 2. Product vision

A **university-scoped** delivery network in which every rider is a **verified UNIOSUN student**, every run stays inside **approved campus and nearby student-township zones**, service hours respect **student safety realities (6 PM warning, 9 PM cutoff)**, and every naira is **reconcilable** — with disputes and safety incidents handled by humans, not automated penalties.

ROOT-X is **not** a city-wide or statewide delivery app. The service boundary is a hard product constraint, not a launch limitation.

## 3. Goals and non-goals

### Goals
1. Safe, accountable, affordable intra-campus and campus-adjacent deliveries.
2. Flexible income for verified student riders that fits around lectures.
3. Complete auditability: payments, commissions, refunds, earnings, admin actions.
4. Guest-friendly receiving (no account required to receive or track).
5. Operable by a very small team with clear admin tooling.

### Non-goals (v1)
- Statewide or inter-city logistics.
- Non-student riders (see §8, constraint C-1).
- Real-time fare negotiation or surge pricing.
- Freight beyond the eligibility rules in `docs/08` (≤ 30 kg, ≤ 90 L per package; eligible bulk only via multi-item rules).
- Insurance products. ROOT-X does **not** offer insurance unless verified coverage is confirmed in writing (`docs/19` A-7).
- Food delivery with temperature-controlled logistics.

## 4. Personas

| Persona | Description | Primary needs |
|---|---|---|
| **Ada** — sender/customer | 300-level student, Osogbo campus | Send documents/parcels quickly, pay by card/transfer/wallet, track, prove delivery |
| **Tunde** — receiver | Student in hostel or township | Know when the package arrives, get in without an account if needed |
| **Kofi** — student rider | Verified student, motorcycle | Predictable offers, transparent earnings, safety tools, no penalty for refusing unsafe work |
| **Mrs. Bello** — ops admin | Ops lead | Approve riders, monitor live deliveries, manage zones and pricing, resolve cases |
| **Mr. Adeyemi** — finance | Finance staff | Reconcile payments, propose settlements, export records, never approve alone |
| **Security officer** | Campus security liaison | Receive safety escalations, resolve incidents with audited notes |

## 5. Platforms

- **Responsive web app** (primary for prototype; mobile-first layout).
- **Android / iOS** — production plan: PWA first, then thin native/React-Native shells for push notifications, background location and camera flows (`docs/07` §6 documents the decision path).
- **Admin dashboard** — same web codebase, role-gated (`/admin`).

## 6. Core capabilities (implemented in the prototype)

### 6.1 Roles and access
Customer/sender, receiver, guest receiver (private revocable time-limited tracking link), approved student rider, admin/ops staff, privileged finance and security staff. Role-based access is enforced in the business layer — not just hidden UI (`docs/10`).

### 6.2 Delivery modes
- Single-item and multi-item deliveries.
- Eligible bulk (rule-checked; oversized/overweight rejected at quote time).
- Immediate, scheduled and recurring (weekly plan × pick-day × time).
- Multi-pickup and multi-destination runs with extra-stop pricing.

### 6.3 Rider lifecycle
Application (matric number, student ID document upload, emergency contact, transport method, terms acceptance) → manual admin review → approved/rejected with notes → ride with capacity limits, working hours and availability toggles. Unapproved applicants never appear eligible to customers. Duplicate accounts and role bypass are blocked by uniqueness checks (`docs/10` §5).

### 6.4 Matching
Rule-based eligibility (zone, transport capacity, fragile qualification, high-value rating floor, availability, safety hours) with a transparent score for ranking. Riders see offers with full route and price terms and can decline without penalty. Single-assignment guard: a delivery can be accepted by exactly one rider.

### 6.5 Verification and tracking
Pickup code (sender → rider) and delivery code (receiver → rider), both brute-force-locked (5 attempts / 10 min, configurable), every attempt recorded. Rider location is shared only during active runs; the UI explicitly distinguishes live vs stale location. Guest tracking links are unguessable, time-limited (48 h default) and revocable; a fresh link can be rotated at any time.

### 6.6 Payments and accountability
Card / bank transfer / wallet. **Unconfirmed payment is never treated as successful** — deliveries advance only on verified webhook. Every delivery gets a double-entry-style ledger record (charge − gateway fee − commission − adjustments − refunds = rider net) with an invariant assertion, refund accounting (rider share vs platform share), two-person settlement (finance proposes, admin approves), and CSV export for reconciliation.

### 6.7 Safety
- 6 PM safety warning to all users; 9 PM new-delivery closure with booking cutoff computed from ETA + handling buffer.
- Active deliveries at closure continue to a **safe resolution** (delivery, verified return-to-sender or supervised cancellation) — never an abrupt stop.
- Emergency reporting (SOS) always available, including after closure.
- Safety-motivated cancellations are free; no automated penalties — every case is resolved by a human with an audited note.

### 6.8 Admin
Ops overview (live map, service window state, queue), rider application review, zone management (activate/deactivate, inter-zone policy), pricing configuration without code changes, finance (reconciliation + settlement), cases (disputes + safety incidents with event timelines), append-only audit log.

## 7. Success metrics (pilot)

| Metric | Target (pilot, configurable) |
|---|---|
| Deliveries completed per active day | ≥ 30 |
| Share of deliveries verified by both codes | 100 % (enforced) |
| Median pickup-to-delivery time | ≤ 45 min intra-campus |
| Rider application approval turnaround | ≤ 48 h |
| Payment reconciliation gap per settlement batch | ₦0 (invariant-enforced) |
| Safety incidents resolved within 24 h | ≥ 95 % |
| 9 PM compliance (new bookings after cutoff) | 0 |

## 8. Hard constraints (from the founding brief — non-negotiable)

- **C-1** Only verified UNIOSUN students may be riders; every application requires student ID upload, matric number and manual approval; no unapproved applicant ever appears eligible; no duplicate accounts or role bypass.
- **C-2** Senders/receivers must satisfy approved school-environment residency/location requirements; service is limited to approved campuses plus defined nearby student-township areas.
- **C-3** 6 PM warning and 9 PM new-delivery restriction; active deliveries handled responsibly at closure; emergency reporting stays accessible.
- **C-4** Location sharing is permission-aware and limited to legitimate delivery needs; tracking links are private, revocable, time-limited; pickup/delivery verification enforced with codes, brute-force protection and audit records.
- **C-5** Payments, commissions, refunds and rider earnings must be auditable and reconcilable.
- **C-6** Suspicious activity triggers proportionate safeguards, an investigation record and an appeal path; no indiscriminate automated penalties; safety-related pause/cancellation is never auto-punished.
- **C-7** Admin powers are role-gated and audit-logged; permissions are enforced in the backend, not just hidden UI.
- **C-8** Stale location data must be clearly identified; poor network handled safely; never present stale as live; never treat unconfirmed payment as successful.
- **C-9** Privacy, accessibility, secure development and applicable legal review are part of the delivery plan.

## 9. Out-of-scope claims (binding)

ROOT-X must not publish: a final commission percentage, an exact price table, definitive insurance coverage, claims of UNIOSUN partnership/affiliation, unapproved service zones, or compliance claims. All such values exist only as documented configurable defaults (`src/engine/config.ts`, `docs/19`).

## 10. Release phases

Defined in the founding brief §36 and mirrored in `docs/20-pilot-launch-checklist.md`: requirements → design → engine + prototype → verification and security → docs and handover → pilot → launch decision.
