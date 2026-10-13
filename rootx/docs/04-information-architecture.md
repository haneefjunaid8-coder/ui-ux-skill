# 04 — Information Architecture

## 1. Route map (as implemented in the prototype)

```
/                         → role redirect (login state + role)
/login                    → phone + OTP (+ MFA gate for admin/finance)
/track/:token             → PUBLIC guest tracking (no account)

  Customer shell (bottom tab nav, mobile-first)
  /home                   → service status, quick actions, saved places, active runs
  /new                    → booking wizard (stops → package → transport → timing → quote → pay)
  /deliveries             → list: active / scheduled / recurring / history
  /deliveries/:id         → detail: map, timeline, codes, receiver link, cancel, rate, report
  /wallet                 → balance, top-up (demo), transactions
  /notifications          → grouped inbox (delivery / payment / safety / system)
  /profile                → identity, zone, saved places, notification prefs
  /support                → help topics, contact, prohibited items

  Rider shell
  /rider                  → dashboard: availability, offer feed, active run entry
  /rider/apply            → application wizard (matric, ID upload, emergency contact, terms)
  /rider/delivery/:id     → active run: route, verification steps, SOS
  /rider/earnings         → pending/available, payout requests, statements
  /rider/performance      → rating, completed, on-time, capacity, working hours

  Admin shell (role-gated; /admin)
  /admin                  → ops overview: live map, window phase, queues, today's numbers
  /admin/applications     → rider verification queue + evidence viewer
  /admin/deliveries       → all deliveries, filters, detail drawer
  /admin/zones            → zone activation, inter-zone policy, landmarks
  /admin/pricing          → configurable fares/fees/commission + rider-net preview
  /admin/finance          → reconciliation, invariant flags, settlement batches, CSV export
  /admin/cases            → disputes + safety incidents with timelines and resolution flows
  /admin/audit            → append-only audit log
```

## 2. Navigation model

- **Role-based shells.** After login the user lands in exactly one shell; admins can switch context explicitly. There is no way to deep-link into another role's surface without the session proving that role (backend-enforced).
- **Mobile-first customer shell.** Five-item bottom tab bar (Home, New, Deliveries, Wallet, Profile); notification badge with unread count; sticky service-window chip.
- **Rider shell optimizes for one-hand, on-the-road use:** giant availability toggle, one active run, verification steps as a linear stepper with the code entry keyboard-optimized.
- **Admin uses a left-rail desktop layout** with sections grouped by duty: *Operate* (Overview, Deliveries, Applications, Zones), *Business* (Pricing, Finance), *Oversight* (Cases, Audit).
- **Guest has no navigation** — a single focused page that cannot wander.

## 3. Object model (user-facing concepts)

| Concept | User language | Where it lives |
|---|---|---|
| Delivery (run) | "delivery" / "run" | wizard → detail → history |
| Stop | pickup / dropoff point | wizard step 1, detail map |
| Saved place | "My places" | profile + wizard shortcuts |
| Quote | price breakdown | wizard review step |
| Package | what's being sent | wizard step 2 (photos, declaration) |
| Tracking link | receiver link | detail page (copy/rotate/revoke) |
| Codes | pickup code / delivery code | detail (sender), active run (rider), guest page (receiver) |
| Ledger | (admin/finance only) earnings split | finance page |
| Settlement batch | payout batch | finance page |
| Case | dispute / safety incident | cases page |
| Service window | service hours / safety hours | status chip everywhere |
| Zone | campus / student-township area | admin zones, registration |

## 4. Content hierarchy per key screen

**Delivery detail (sender)** — 1) status + progress stepper; 2) live map with rider chip (live/stale badge); 3) actions for the current state (show pickup code / share receiver link / cancel with fee preview); 4) timeline of every status change with actor and time; 5) payment + ledger summary; 6) help/report.

**Active run (rider)** — 1) next best action (the verification stepper); 2) route + destination; 3) package handling notes + fragile/food chips; 4) earnings for this run; 5) SOS (always reachable, fixed).

**Ops overview (admin)** — 1) service-window phase banner (open / warning / cutoff / closed); 2) live map of active runs + rider availability; 3) queues (unassigned, verification-pending, open cases); 4) today's numbers; 5) applications awaiting review.

**Guest tracking** — 1) current status in plain language; 2) map position + ETA; 3) what happens next; 4) delivery code; 5) expiry + "this link is private" note; 6) safety contact.

## 5. Empty, error and edge states (designed, not accidental)

- No deliveries yet → guidance to first booking, service-window context.
- No riders available (offer expiry round 3) → honest "still finding a rider" + free-cancel option.
- Payment failed → "no money was taken" + retry.
- Stale location → "last seen X min ago" chip; map marker greys out.
- Offline → persistent banner; queued actions marked; never fake success.
- After closure → banner with reopening time; emergency actions remain.
- Locked verification → lockout timer in plain language for both parties.
- Revoked/expired guest link → explanation + "ask the sender for a fresh link".

## 6. Cross-linking and deep links

- `/track/:token` is the only public deep link; tokens are unguessable and revocable.
- Notifications deep-link to the relevant delivery/case.
- Admin lists deep-link to drawers with full context (delivery → its case → its ledger).
- Production: all routes server-renderable for share/restore; no state lives only in memory (prototype keeps state in the store with localStorage persistence).
