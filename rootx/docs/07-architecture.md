# 07 — System Architecture

## 1. Architecture overview

```
                        ┌──────────────────────────────────────────────┐
                        │                  CLIENTS                     │
   ┌─────────────┐      │  ┌──────────┐ ┌─────────┐ ┌───────────────┐ │
   │  Customers  │──────┼─▶│  PWA web │ │ Android │ │     iOS       │ │
   │  Riders     │      │  │ (React)  │ │  shell  │ │    shell      │ │
   │  Admins     │      │  └────┬─────┘ └────┬────┘ └───────┬───────┘ │
   │  Guests     │      └───────┼────────────┼──────────────┼─────────┘
   └─────────────┘              └────────────┴──────────────┘
                                        │ HTTPS (REST/JSON + webhooks)
                       ┌────────────────▼─────────────────┐
                       │        API GATEWAY / BFF         │  authn (JWT short-lived),
                       │  (stateless) — validates EVERY   │  rate limits, request IDs
                       │  business rule server-side       │
                       └───┬───────┬───────┬───────┬──────┘
                           │       │       │       │
        ┌──────────────────▼─┐ ┌───▼────┐ ┌▼──────┐ ┌▼───────────────┐
        │  Delivery service   │ │ Rider │ │ Pay-  │ │ Notification   │
        │  (state machine,    │ │ svc   │ │ ments │ │ svc (push/SMS/ │
        │   matching, codes)  │ │ (veri-│ │ svc   │ │ email, in-app) │
        └──────┬──────────────┘ │fication│ │(ledg- │ └───────────────┘
               │                │ queue) │ │ers)  │
               │                └───┬────┘ └──┬───┘
               │                    │         │ webhooks
        ┌──────▼────────────────────▼─────────▼───────────────────┐
        │                    POSTGRES (primary)                    │
        │   ACID: users, applications, deliveries, ledgers,       │
        │   batches, cases, incidents, audit_log (append-only)     │
        └──────┬──────────────────────────────────────────────────┘
               │ logical replication / CDC
        ┌──────▼───────────┐   ┌──────────────┐   ┌────────────────┐
        │  Redis           │   │ Object store │   │  Geo/tile svc  │
        │  (queues, locks, │   │ (photos, ID  │   │  (OSM tiles,   │
        │   OTP counters,  │   │  documents — │   │  geocode,      │
        │   rate limits)   │   │  private)    │   │  routing)      │
        └──────────────────┘   └──────────────┘   └────────────────┘
```

## 2. The layered rule (why this shape)

**All business rules — state transitions, safety hours, pricing, matching eligibility, verification lockouts, refunds, settlement — live in one pure rules layer.** In the prototype that layer is `src/engine/` (TypeScript, no I/O, fully unit-tested). In production the same layer compiles into the API services, so:

- clients can never be the source of truth (C-7, C-8);
- rules are testable without infrastructure (54 tests run in ~2 s);
- pricing/commission/zone policy are config, not code (admin-editable, audit-logged);
- the prototype's reducer *is* the production rules package — same functions, different I/O shell.

## 3. Component responsibilities

| Service | Owns | Never does |
|---|---|---|
| API gateway/BFF | authn, rate limits, request IDs, payload validation | business decisions |
| Delivery service | state machine, matching, codes, safety hours, tracking tokens | money movement |
| Rider service | applications, verification evidence, availability, SOS routing | auto-approving, auto-penalizing |
| Payments service | gateway integration, webhooks, ledgers, refunds, settlement batches | approving its own settlements |
| Notification service | in-app inbox, push, SMS, email, batching | reading delivery state directly (subscribes to events) |
| Audit sink | append-only log of every privileged action | updates/deletes |

Events (delivery.created, payment.verified, code.locked, incident.opened, settlement.approved…) flow over Redis Streams; each consumer is idempotent.

## 4. Data flows (critical paths)

### 4.1 Booking → payment → matching
1. Client submits delivery intent → gateway validates session + zone eligibility **server-side** (C-2).
2. Quote computed by the pricing rules from config; quote hash stored with the delivery.
3. Payment intent created at gateway; delivery parked in `payment_processing`.
4. **Only a signature-verified webhook** advances payment state (C-8). Idempotency keys make replays safe.
5. Matching worker offers to eligible riders (safety-window checked); single-assignment via a Redis lock on the delivery row.
6. Offers expire in rounds; after round 3 the customer is notified with a free-cancel option.

### 4.2 Verification
Pickup/delivery codes are generated server-side, delivered in-app (sender) / via link (receiver). Attempts are counted server-side per code; 5 misses → 10-minute lockout, both parties notified, events recorded (C-4).

### 4.3 Location
Rider app publishes location **only while an active run exists** and the rider granted permission; writes go to a hot store (Redis) and are downsampled to PostGIS points. Consumers read with an `updatedAt` watermark — anything older than the staleness threshold renders as **stale** (C-8). No location is written when no run is active.

### 4.4 Money
Charge → webhook verify → ledger row (invariant-enforced) → delivery completes → ledger `ready` → finance proposes batch → admin approves → payout provider transfer → ledger `settled`. Refunds are ledger adjustments with explicit rider/platform split. The invariant `charge − gatewayFee − commission − Σadjustments − refunded = riderNet` is asserted on every write (C-5).

### 4.5 Safety hours
A time service evaluates the window (`evaluateServiceWindow`) for every booking/offer attempt; the 18:00 warning and 21:00 closure are broadcast events; in-flight runs continue to safe resolution (C-3).

## 5. Deployment topology (production)

- **Region:** single region (Lagos, Nigeria) initially — latency to campus is dominated by mobile networks, not geography.
- **Compute:** containers behind a load balancer; 2+ replicas per stateless service; workers for matching/settlement/payouts.
- **Data:** managed Postgres (primary + standby, PITR), Redis (managed), object storage with signed private URLs for photos/ID documents.
- **CDN** for the PWA and map tiles; tiles self-hosted or from an OSM provider with usage policy compliance (`docs/12`).
- **Secrets:** managed secret store; gateway webhook secrets rotated; no secrets in code or env files in git.

## 6. Alternatives and trade-offs (documented before committing)

| Decision | Chosen | Alternatives | Why |
|---|---|---|---|
| Rules layer | Pure TS package shared prototype→server | (a) rules in DB triggers, (b) rules per-service, (c) rules only client-side | (a) untestable and vendor-locked; (b) drift between services; (c) violates C-7/C-8. Shared package keeps one tested truth with 2-second test cycles. |
| Monolith vs microservices | **Modular monolith first** (services above are modules) | Full microservices on day one | Team size (~3–5) and pilot scale don't justify distributed ops; module boundaries above make later extraction mechanical. Extract notifications and payments first if needed. |
| Client | PWA first | Native apps immediately | PWA reaches all students instantly, updates server-side; native shells follow for push/background-location reliability on Android/iOS. |
| Map data | OSM self-hosted/provider | Google Maps | Cost, offline campus geometry control, and open data terms; OSM campus coverage in Nigeria is good and improvable by the community. |
| Realtime | WebSocket for tracking + push notifications | Polling only | Live tracking is core; polling wastes scarce data. WebSocket with graceful polling fallback for weak networks (C-8). |
| Payments | Aggregator gateway (e.g., Paystack/Flutterwave class) | Direct bank integration | Aggregators handle card/transfer/USSD and webhooks; direct bank rails are a later optimization. **No provider is finalized** — see `docs/19` U-2. |
| DB | Postgres (+PostGIS) | MongoDB, MySQL | Money and state machines need ACID + constraints; PostGIS does zones/geofencing natively. |
| Queue | Redis Streams | Kafka, RabbitMQ | Right-sized; Kafka ops burden unjustified at pilot scale; Redis already required for hot data. |

## 7. Scaling path (pilot → growth)

1. Pilot (1 campus, ~200 runs/day): single monolith, managed Postgres, ~$50–100/mo.
2. Multi-campus: zones are config rows; add campus = add zones + landmarks + ops staff, zero schema change.
3. Growth (>5k runs/day): extract payments and notifications services; add read replicas; matching worker fleet behind the same Redis Streams.

## 8. Failure modes and degraded operation

| Failure | Behaviour |
|---|---|
| Gateway webhook delayed | Deliveries stay in `payment_processing` with honest UI; retry + reconciliation job; never auto-succeed (C-8). |
| WebSocket drops | Client falls back to 30 s polling; map shows last-known with stale badge. |
| Redis down | Offers pause (fail-closed), active runs continue from Postgres state. |
| Postgres failover | Writes pause seconds; clients show offline banner; queued actions replay. |
| Notification provider down | In-app inbox still works; SMS/push retry with backoff. |
| Map tiles down | Schematic fallback (zone polygons pre-rendered) — the prototype map is exactly this mode. |
