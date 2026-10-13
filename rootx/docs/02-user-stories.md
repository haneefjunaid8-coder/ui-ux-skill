# 02 — User Stories and Acceptance Criteria

Stories follow `As a <role>, I want <capability>, so that <benefit>`. Acceptance criteria are Given/When/Then and are **implemented as tests where the engine allows** (`rootx/app/src/engine/*.test.ts`). IDs map to PRD §6 capabilities.

Legend: ✅ = implemented and tested in the prototype; 🔶 = specified, UI stub or simplified in prototype; 📋 = production-only (requires real integrations).

---

## A. Accounts and access

### A-1 Phone-first login ✅
As a student, I want to sign in with just my phone number and an OTP, so that I don't manage another password.
- Given a registered phone, when I request an OTP, then exactly one code is issued and stored server-side with an attempt counter.
- When I enter 5 wrong codes, then the OTP flow locks for 10 minutes (configurable `otpLockoutAttempts`, `otpLockoutMinutes`).
- When I enter the right code, then I am signed in — unless my account is admin/finance, in which case MFA is required first.

### A-2 Registration with residency ✅
As a new member, I want to register with my name and zone, so that the service knows I'm within the approved environment.
- Given an unregistered phone, when I verify the OTP with a name + zone, then an account is created in that zone.
- Given a zone that is deactivated by admin, then registration for that zone is refused.

### A-3 Admin MFA ✅
As an admin, I want a second verification step, so that a leaked OTP alone cannot reach admin powers.
- Given an admin/finance account, when OTP succeeds, then the session is held at an MFA gate until the second code is verified.

### A-4 Guest receiving ✅
As a receiver without an account, I want to track my package from a private link, so that I don't need to install or register anything.
- Given a sender shared the tracking link, when I open it, then I see only that delivery's status, map progress and delivery code entry.
- When the sender revokes the link, then it stops working immediately.
- When the link expires (48 h default), then it stops working.

## B. Booking a delivery

### B-1 Quote before commitment ✅
As a sender, I want an instant price quote with a line-by-line breakdown, so that I know exactly what I pay and why.
- Given pickup/dropoff inside the same approved zone, when I request a quote, then I receive line items (base fare, distance, size tier, weight, fragile/food fees, extra stops, high-value fee) and a total.
- Given any leg crossing into an unapproved area, then the quote is refused with the reason.

### B-2 Package eligibility ✅
As a sender, I want to know immediately if my package is eligible, so that I don't waste time.
- Given a package over 30 kg or 90 L, when I describe it, then booking is blocked with the limit that was exceeded.
- Given a declared value over the cap, then booking is blocked and high-value rules apply below the cap.
- Given a prohibited category, then I must acknowledge the prohibited-items policy; mis-declaration is grounds for account action.

### B-3 Photos and declaration ✅
As a sender, I want to attach photos and declare contents, so that disputes have evidence.
- Given fewer than one photo, then booking cannot proceed.
- Given I did not declare contents legal/permitted, then booking cannot proceed.

### B-4 Schedule or recur 🔶
As a sender, I want to schedule a delivery or set a weekly recurring plan, so that routine runs (e.g., stock to my hostel shop every Monday) happen automatically.
- Given a scheduled slot, when the slot cannot complete before the 9 PM closure (ETA + handling + cutoff buffers), then the slot is refused.
- Given an active recurring plan, when the next occurrence arrives and my wallet covers it, then a delivery is created and matched automatically.
- Given insufficient wallet balance, then the plan is paused (not cancelled) and I am notified.

### B-5 Multi-stop runs ✅
As a sender, I want to add pickups/dropoffs, so that one run serves several stops.
- Given extra stops, when quoting, then each extra stop adds the configured fee and the ETA reflects the longer route.

### B-6 Pay without ambiguity ✅
As a sender, I want to pay by card, transfer or wallet, so that I can use what I have.
- Given any payment method, when I pay, then the delivery sits in `payment_processing` until the gateway webhook verifies it — never showing as paid before then.
- Given a failed webhook, then the delivery returns to `awaiting_payment` with a clear "no money was taken" message.

## C. Rider experience

### C-1 Apply with evidence ✅
As a student who wants to ride, I want to apply with my matric number, student ID upload and emergency contact, so that verification is serious but simple.
- Given an application, when I submit, then it enters the queue with my documents — visible only to admins.
- Given I am unapproved, then I never appear in matching, offers or customer-facing rider lists.

### C-2 Human review ✅
As an admin, I want to review each application manually, so that only genuine verified students ride.
- Given a submitted application, when I approve, then a rider profile is created with the declared transport capacities.
- When I reject, then a note is required and the applicant sees the decision.
- Every decision is written to the audit log with actor, target and reason.

### C-3 Transparent offers ✅
As a rider, I want offers with the full route, package terms and my expected net earnings, so that I can decide quickly.
- Given an eligible delivery, when it is offered, then I see pickup/dropoff, distance, ETA, package summary and rider net (total − gateway fee − commission).
- When I decline, then there is no penalty and the offer goes to the next rider.

### C-4 Verification flow ✅
As a rider, I want to verify pickup with the sender's code and delivery with the receiver's code, so that both ends are proven.
- Given I am at pickup, when I enter the sender's code, then the delivery advances to `package_collected` and the event is recorded.
- Given 5 wrong attempts on either code, then verification locks for 10 minutes and the parties are notified.

### C-5 Earnings and payout ✅
As a rider, I want to see pending vs available earnings and request a payout, so that I control my money.
- Given a completed delivery, when the ledger settles, then my net moves from pending to available.
- Given available earnings below the minimum payout (`payoutMinAmount`), then payout request is refused.

### C-6 Safety tools ✅
As a rider, I want an SOS and an availability toggle, so that I am never forced into unsafe work.
- Given any active delivery, when I raise an SOS (harassment, accident, unsafe area), then an incident opens with an event timeline and admins are notified.
- Given a safety-motivated cancellation, then no cancellation fee is charged to the sender and no penalty is applied to me.

## D. Tracking and receiving

### D-1 Live map with honesty ✅
As a sender, I want to see the rider's live position, so that I know when to be ready.
- Given the rider's location is older than the staleness threshold, then the UI labels it **stale** with the age — never presented as live.
- Given poor network, when updates stop, then the map degrades gracefully and reconnects.

### D-2 Delivery code ✅
As a receiver, I want to hand a code to the rider, so that only the right person receives my package.
- Given the rider at my door, when they enter my delivery code, then the delivery completes and is time-stamped for both parties.

### D-3 Rate the run ✅
As a sender, I want to rate and tag the run, so that quality is visible.
- Given a delivered run, when I rate it 1–5 with optional tags, then the rating feeds rider metrics (no automatic penalty).

## E. Disputes and safety

### E-1 Report a problem ✅
As a sender, I want to report damage or failure, so that there is a case with evidence.
- Given a delivered (or failed) delivery, when I report a problem with a description, then a dispute case opens with the full delivery context attached.

### E-2 Human resolution ✅
As an admin, I want to resolve cases with structured outcomes, so that decisions are consistent and auditable.
- Given a dispute, when I resolve it, then I must choose an outcome (refund variants, no action, rider warning, escalation), a refund amount and split (rider share vs platform share), and a note.
- When the refund applies, then the ledger records the adjustment and the rider's net is adjusted exactly by the invariant.

### E-3 No automated penalties ✅
As any user, I want assurance that suspicion never equals punishment, so that I trust the platform.
- Given any suspicious-activity flag, when it is raised, then only proportionate safeguards (e.g., pause new offers) apply pending human review, and the subject can appeal.
- Given a safety-related pause or cancellation, then no automatic penalty is recorded.

### E-4 Safety hours ✅
As a student, I want the platform to respect night-time risks, so that nobody is pushed to ride late.
- Given 6 PM, when the warning fires, then all users see the safety notice.
- Given a booking request whose completion would breach the 9 PM closure (ETA + buffers), when it is submitted, then it is refused with a clear message.
- Given 9 PM with deliveries in flight, when closure fires, then active deliveries continue to a safe resolution and emergency reporting stays available.

## F. Admin and finance

### F-1 Live oversight ✅
As an admin, I want a live map and queue, so that I can see the state of the service.
- Given any moment, when I open ops overview, then I see zone states, service-window phase, live deliveries, queue depth, rider availability and today's numbers.

### F-2 Zones without code changes ✅
As an admin, I want to activate/deactivate zones and set the inter-zone policy, so that geography follows approvals.
- Given a zone, when I deactivate it, then new bookings for it stop immediately; active deliveries continue safely.

### F-3 Pricing without code changes ✅
As an admin, I want to change fares, fees and commission, so that the business can tune without a deploy.
- Given any pricing field, when I change it, then new quotes use it immediately and the change is audit-logged.

### F-4 Two-person settlement ✅
As finance staff, I want to propose settlement batches that an admin must approve, so that no single person moves money.
- Given ready ledgers, when I (finance) run settlement, then a batch is created `awaiting_approval` — and I **cannot** approve my own batch.
- Given an admin, when they approve, then riders' nets are marked paid and both actors are in the audit trail.

### F-5 Reconciliation 📋
As finance staff, I want gateway records matched to platform ledgers, so that every naira is accounted for.
- Given a settlement window, when I reconcile, then each ledger is matched to its gateway reference with an invariant ✓/⚠ flag and exportable CSV.

### F-6 Append-only audit ✅
As a security reviewer, I want every privileged action logged immutably, so that oversight is real.
- Given any admin action, when it executes, then the audit log records actor, action, target, reason, before/after and timestamp.
- Given the log, when I view it, then entries cannot be edited or deleted from the UI.

## G. Cross-cutting

### G-1 Poor network ✅
As a user on weak data, I want the app to degrade gracefully, so that I am never misled.
- Given offline state, when I act, then actions queue (prototype: demo toggle) and the UI shows the offline state rather than fake success.

### G-2 Accessibility 🔶
As a user with disabilities, I want the app usable with assistive tech.
- Semantic landmarks, labelled controls, focus states, AA-contrast tokens are in the design system; full audit is a production task (`docs/13` §8).

### G-3 Language ✅ (structure)
As a non-native user, I want future languages.
- All copy lives in components with a single copy source; English first, structured for translation (`docs/06` §9).
