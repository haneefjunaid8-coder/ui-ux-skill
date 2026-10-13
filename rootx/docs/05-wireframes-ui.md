# 05 — Wireframes and UI Evolution

This document records the wireframe → polished-UI path for the key screens, plus the interaction patterns that came out of them. The **implemented** UI is the source of truth (`rootx/app/src/pages`); the sketches below describe its structure so future designers can trace decisions.

## 1. Wireframe notation

Lo-fi block sketches (ASCII) at 360 px mobile width. `[]` interactive, `()` data, `—` divider, `**` emphasis.

## 2. Customer — booking wizard (`/new`)

```
Wireframe (lo-fi)                          Implemented
┌────────────────────────────┐
│ ←  New delivery        (●○○○)│  4-step progress dots; stepper guards
│                            │  back-navigation without data loss
│ Where from?                │
│ [ Landmark picker ▾      ] │  landmark search + map pin
│ [ My places: Hostel A ]    │  saved-place shortcuts
│ Where to?                  │
│ [ Landmark picker ▾      ] │  per-stop receiver name/phone
│ + Add another stop         │  multi-stop with fee preview
│ ──────────────────────────  │
│ (map preview with route)   │  schematic campus map, route polyline
└────────────────────────────┘
  Step 2: package — category chips, weight/dims, photos (required),
          fragile/food toggles, declared value, contents declaration
          → eligibility verdict card (errors block, warnings inform)
  Step 3: transport — foot/bicycle/motorcycle cards with capacity +
          ETA; ineligible options disabled with reason
  Step 4: timing — immediate / scheduled (slot picker) / recurring
          (day chips + time) → quote card with line items and
          rider-net transparency → payment method → PAY
```

Design decisions:
- **Quote before payment, always visible on the pay screen** — no post-hoc price changes.
- **Eligibility verdict as a first-class card** — errors block booking, warnings (fragile, high-value) inform without blocking (`pricing.test.ts` covers this).
- The map is schematic in the prototype (campus-scale abstraction); production swaps in OSM tiles behind the same component interface (`docs/12`).

## 3. Customer — delivery detail (`/deliveries/:id`)

```
┌────────────────────────────┐
│ RX-0102 · Mon 13:40        │  ref + date
│ Market → Hostel A          │  route summary
│ [●================] 68%    │  status stepper + progress
│ (map with rider chip 📍)   │  live/stale badge on the chip
│                            │
│ **Show pickup code**       │  state-dependent primary action
│ [ 4 7 2 9 ]  copy         │
│ Receiver link [copy][new][revoke]                        │
│ ─────────────────────────  │
│ Timeline (every event)     │
│ Cancellation (fee preview) │
│ Payment breakdown          │
│ Problem? → report flow     │
└────────────────────────────┘
```

## 4. Guest tracking (`/track/:token`)

```
┌────────────────────────────┐
│ 📦 Your delivery            │  no login chrome at all
│ [In transit — arriving 14:5]│  plain-language status
│ (map: rider position)       │  last-updated age, stale badge
│ Next: rider will ask for    │
│ your code                   │
│ Your delivery code [ 8 3 1 ]│  the only "input"
│ Link expires Tue 13:40      │  privacy note + safety contact
└────────────────────────────┘
```

Decision: the guest page shows **no personal names** (first name + initial for rider only), no phone numbers, no history — the minimum needed to receive.

## 5. Rider — active run (`/rider/delivery/:id`)

```
┌────────────────────────────┐
│ Run RX-0102        [SOS]  │  SOS fixed top-right, always
│ **1. Go to pickup**        │  linear verification stepper
│ (route card, 1.2 km)       │
│ 2. At pickup → ask sender  │
│    for code [ _ _ _ _ ]    │  numeric keypad focus
│ 3. In transit (live loc)   │
│ 4. At dropoff → ask        │
│    receiver for code       │
│ Earnings this run: ₦1,050  │  net, not gross
│ Package: groceries, fragile│  handling notes prominent
└────────────────────────────┘
```

Decision: the rider sees **net earnings** (total − gateway fee − commission) on the offer and during the run — transparency is a retention feature.

## 6. Rider — application (`/rider/apply`)

Five sections in one scroll with a sticky progress header: identity (name, matric, phone) → student ID document upload → emergency contact (name/phone/relationship) → transport + working hours → terms acceptance (explicit checkbox, timestamped). Submit → "under review" status page. **No path from here to receiving offers** until an admin approves.

## 7. Admin — ops overview (`/admin`)

```
┌────────────────────────────────────────────┐
│ ROOT-X ops     (Service: OPEN · closes 9PM)│  phase banner
│ ┌──────────────┐  Unassigned: 2            │
│ │   live map   │  Verification: 1          │  queues with
│ │ ●runs ●riders│  Open cases:   0          │  deep links
│ └──────────────┘  Applications: 1 awaiting │
│ Today: 18 runs · ₦24k volume · 100% codes  │
└────────────────────────────────────────────┘
```

## 8. Admin — finance (`/admin/finance`)

Reconciliation table with invariant ✓/⚠ per ledger row, refund accounting (rider vs platform share), settlement batches (propose → approve two-person flow rendered explicitly), CSV export. **Finance users see a disabled Approve button with the reason.**

## 9. Evolution notes — wireframe → polished UI

1. **Tokens over pixels:** every screen consumes design-system tokens (`docs/06`); no hard-coded colors in pages.
2. **Status is the hero:** each surface leads with an honest state (window phase, run status, live/stale, payment state) — uncertainty is never hidden.
3. **Destructive actions are quiet-danger:** revoke link, cancel delivery, cancel plan use the `quiet-danger` variant — visible but not alarming.
4. **Verification as a stepper** emerged from wireframing the rider flow: the linear model made code lockouts and stage guards explainable.
5. **The schematic map** was a deliberate prototype choice: it keeps zone geometry, geofencing and routing legible and testable without OSM dependencies; the component interface maps 1:1 to real coordinates in production (`SchematicMap` props are projection-agnostic).
6. **Mobile-first customer, desktop ops:** the customer shell is a bottom-tab PWA layout; admin is a left-rail dashboard. Riders get the largest touch targets (gloved-hand, on-bike use).
7. **Accessibility baked into polish:** focus rings, AA contrast tokens, labelled inputs, semantic landmarks survived from the first wireframes to the final UI.

## 10. Production deltas (planned)

- OSM tile map with real routing (`docs/12`).
- Push notifications replacing in-app-only notifications.
- Camera capture flows for package photos and student ID (native shell).
- Onboarding screens (3-card intro) before first login.
