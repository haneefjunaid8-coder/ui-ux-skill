# 03 — User Journeys and Permission Matrix

## 1. Primary journeys

### J-1 First-time sender → completed delivery
1. Land on `/` → redirected to `/login`.
2. Enter phone → OTP (A-1). New phone → name + zone registration (A-2).
3. Home (`/home`): service-window status chip, quick actions, saved places.
4. New delivery (`/new`): wizard —
   stops (landmark picker or map point, saved places) → package (category, weight, dims, photos, fragile/food, declared value) → transport (foot/bicycle/motorcycle, capacity-checked) → timing (immediate / scheduled / recurring) → **quote** (line items, ETA) → eligibility verdict → pay (card/transfer/wallet).
5. `payment_processing` → webhook verified → `awaiting_rider` → offered → rider assigned.
6. Track on `/deliveries/:id`: map with rider position (live/stale), pickup code to show the rider, receiver link to share (copy / rotate / revoke).
7. Rider verifies pickup code → in transit → arrives → receiver's delivery code → `delivered`.
8. Rate the run; ledger becomes settlement-ready.

### J-2 Guest receiver
1. Opens the private link `/track/:token` (no account, no login).
2. Sees: status timeline, map position, ETA, delivery-code entry point, safety contact.
3. Sees **nothing else** — no sender identity beyond what the sender chose to share, no rider personal data beyond first name/initial and vehicle, no other deliveries.
4. Link dies on revoke/rotate/expiry.

### J-3 Student → verified rider
1. `/rider/apply` — full name, matric number, student ID document upload, phone, emergency contact (name/phone/relationship), transport method, zone, terms acceptance.
2. Status: `submitted` → admin review (`/admin/applications`).
3. Admin checks evidence → approve/reject **with required note**; decision audit-logged.
4. Approved → rider dashboard (`/rider`): availability toggle, working hours, capacity, live offer feed.
5. Declining offers is always free.

### J-4 Rider run
1. Offer arrives (notification + feed) with full terms and **rider net**.
2. Accept → `rider_assigned` → progress: approach pickup → arrive → request pickup code → sender shows code → `package_collected` → in transit (location shared, live on map) → approach destination → arrive → request delivery code → receiver provides code → `delivered`.
3. Earnings: pending → (settlement batch approved) → available → payout request above minimum.
4. SOS at any point → incident opens (J-6).

### J-5 Finance settlement (two-person rule)
1. Finance logs in (OTP + MFA) → `/admin/finance`.
2. Review reconciliation stats (invariant ✓/⚠ per ledger), refund accounting, export CSV.
3. **Run settlement** — batch created from ready ledgers, status `awaiting_approval`. Finance cannot approve it.
4. Admin (separate session) approves (`settlement.approve`) or rejects with reason.
5. Riders' nets are marked paid; both actors and amounts are in the audit trail.

### J-6 Safety incident
1. Rider (or sender) raises SOS / reports a problem → incident/dispute opens with full delivery context.
2. Admin sees it in `/admin/cases` with the event timeline.
3. Proportionate interim safeguards only (e.g., pause new offers to the rider) — **no automatic penalty**.
4. Security/admin resolves with a mandatory audited note; escalation path to campus security contact.
5. Appeal: the subject can respond; resolutions can be revisited by a senior admin with a further audit entry.

### J-7 After-hours closure
1. 18:00 — safety warning broadcast; banner appears in-app.
2. Bookings are accepted only while `now + ETA + handling buffer + cutoff buffer ≤ 21:00`.
3. 21:00 — new-delivery closure broadcast; new bookings/offers blocked.
4. In-flight deliveries continue to a safe resolution: complete, verified return-to-sender, or supervised cancellation.
5. Emergency reporting remains available 24/7.

## 2. Permission matrix

Enforcement point: **backend rules engine** (prototype: the reducer + guards; production: API layer — see `docs/10`). UI hiding is never the only control.

| Capability | Guest | Customer | Rider (approved) | Admin/Ops | Finance | Security |
|---|---|---|---|---|---|---|
| View own tracking link | ✓ | ✓ | ✓ | ✓(ops need) | – | – |
| Create delivery | – | ✓ | ✓ (as sender) | – | – | – |
| Pay for delivery | – | ✓ | ✓ | – | – | – |
| Cancel own delivery | – | ✓ | – | ✓ (audited) | – | – |
| See pickup code | – | ✓(own) | ✓(active run) | ✓(audited) | – | – |
| Revoke/rotate tracking link | – | ✓(own) | – | ✓(audited) | – | – |
| Apply as rider | – | ✓ | – | – | – | – |
| See rider applications queue | – | – | – | ✓ | – | – |
| Approve/reject rider application | – | – | – | ✓ (note required) | – | – |
| See offers feed | – | – | ✓ | ✓ | – | – |
| Accept/decline offer | – | – | ✓ | – | – | – |
| Verify pickup/delivery code | – | – | ✓ | – | – | – |
| Raise SOS | – | ✓ | ✓ | – | – | – |
| Resolve dispute | – | – | – | ✓ (note required) | refund input | consulted |
| Resolve safety incident | – | – | – | ✓ | – | ✓ (note required) |
| Manage zones | – | – | – | ✓ | – | – |
| Manage pricing/commission | – | – | – | ✓ | – | – |
| Run settlement batch | – | – | – | – | ✓ (propose only) | – |
| Approve settlement batch | – | – | – | ✓ | ✗ (own proposal) | – |
| Reject settlement batch | – | – | – | ✓ (reason required) | – | – |
| View audit log | – | – | – | ✓ | ✓ | ✓ |
| Export financial CSV | – | – | – | – | ✓ | – |
| Suspend rider | – | – | – | ✓ (audited, appealable) | – | – |
| View financial ledgers | – | – | own | ✓ | ✓ | – |
| View student ID documents | – | – | – | ✓ (verification only) | – | – |

Key rules:
- **Riders are never automatically visible as eligible** until `application.status === 'approved'`.
- **Finance proposes, admin approves** — the same session cannot do both (tested).
- **Security staff** resolve incidents, not money; **finance** touches money, not riders.
- Every ✓ in the admin block generates an audit-log entry.

## 3. State-machine gate permissions

Who may drive which transition (enforced by `guardTransition` evidence + session role in the engine):

| Transition | Driven by | Guard evidence required |
|---|---|---|
| create → `awaiting_payment` | customer | valid package + zones + quote |
| `awaiting_payment` → `payment_processing` | customer | active payment attempt, idempotent |
| `payment_processing` → `awaiting_rider` | **system (webhook only)** | payment verified `succeeded` |
| `payment_processing` → `awaiting_payment` | system | payment `failed` |
| `awaiting_rider` → `offered_to_riders` | system matcher | safety window allows completion |
| `offered_to_riders` → `rider_assigned` | rider | rider in offer list, single-assignment |
| → `package_collected` | rider | pickup code verified |
| → `delivered` | rider | delivery code verified |
| → `cancelled` | customer (fee stages) / admin / safety | reason recorded; safety → fee waived |
| → `return_required` | rider (failed attempt) | failed-delivery wait policy |
| → `disputed`/`under_review` | customer report / admin | case record |

The full transition table is in `src/engine/stateMachine.ts` and tested in `stateMachine.test.ts`.
