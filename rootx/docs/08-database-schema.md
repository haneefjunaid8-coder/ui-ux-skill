# 08 — Database Schema and Migrations

PostgreSQL 15+ with PostGIS. Full DDL in `database/schema.sql`; migrations in `database/migrations/`. The prototype mirrors this schema in TypeScript types (`src/engine/types.ts`) — the engine is the behavioural spec, the SQL is the persistence spec.

## 1. Entity overview

```
users ─┬─< saved_locations
       ├─< otp_challenges (ephemeral)
       ├─< rider_applications >─ documents (object refs)
       │        └─approved─> rider_profiles ─< rider_availability_days
       ├─< deliveries >─┬─< delivery_stops
       │                ├─< delivery_events (append-only status history)
       │                ├─< verification_attempts (append-only)
       │                ├─ tracking_tokens
       │                ├─ payments >─ payment_events (append-only)
       │                └─ ledger_records
       ├─< disputes    >─ dispute_events
       ├─< incidents   >─ incident_events
       ├─< notifications
       └─< payouts >── settlement_batches (two-person rule)

zones >─ landmarks            config_versions (pricing/hours/policies)
audit_log (append-only)       recurring_plans >─ occurrences
```

## 2. Key tables (summary — see schema.sql for full DDL)

### Identity and access
- **users** — `id uuid pk`, `phone citext unique not null`, `name`, `role customer|rider|admin|finance|security`, `zone_id fk`, `wallet_balance_ngnk int` (kobo), `status active|suspended|banned`, `created_at`. Uniqueness on phone blocks duplicate accounts (C-1). One rider application per user enforced by partial unique index.
- **otp_challenges** — phone, hashed code, attempts, locked_until, expires_at. **Codes are hashed, never stored plain.**
- **sessions** — refresh token hashes, device, mfa_required flag.

### Rider verification (C-1)
- **rider_applications** — `user_id fk unique (where status <> rejected)`, full name, `matric_number`, `student_id_doc_ref` (private object store ref), phone, emergency contact (name/phone/relationship), transport, zone, `status draft|submitted|approved|rejected`, `terms_accepted_at`, submitted_at. Matric numbers normalized (upper, no spaces) + unique index → no duplicate rider identities.
- **rider_profiles** — created **only** by application approval (trigger + service rule): capacities (kg, litres), zone, rating aggregates, earnings balances (pending, available), `is_available`.
- **application_review_notes** — at, by_admin fk, note (required), decision. Every review is recorded.

### Geography (C-2)
- **zones** — `id text pk`, campus_id, name, kind campus|township, `geom geometry(Polygon,4326)`, `active bool`, inter-zone policy columns, config version.
- **landmarks** — zone fk, name, kind gate|academic|hostel|commercial|health|transport, point.
- Eligibility check: `ST_Contains(zone.geom, point)` — server-side only; the client never decides zone membership.

### Deliveries and verification (C-4, C-8)
- **deliveries** — customer fk, kind immediate|scheduled|recurring, status (enum = `DeliveryStatus` in the engine), stops (child table with sequence), package fields (incl. photos as private object refs, `contents_declared bool`, handling notes), `quote jsonb` + `quote_hash`, pricing config version, scheduled_for, recurrence fk, cancel fields, safety_flags[], rider fk (nullable), ref (human-readable `RX-####`).
- **delivery_events** — append-only status history: delivery fk, from_status, to_status, actor_type system|customer|rider|admin, actor_id, note, at. **No updates, no deletes** (revoked via REVOKE UPDATE/DELETE).
- **pickup/delivery codes** — stored **hashed** (like passwords); `verification_attempts` table records every attempt (code kind, ok bool, by, at) — brute-force counters derive from it; lockouts enforced in the rules layer.
- **tracking_tokens** — delivery fk, `token_hash` (tokens themselves only exist in the URL once), expires_at, `revoked_at nullable`, rotated_from fk.

### Money (C-5)
- **payments** — delivery fk, method card|transfer|wallet, amount_ngnk, status initiated|processing|succeeded|failed, `gateway_ref`, **`idempotency_key unique`**, events child table (append-only).
- **ledger_records** — delivery fk unique, charge, gateway_fee, commission, `adjustments jsonb[]` (label + signed amount), refunded, rider_net, settlement pending|ready|settled, settled_at, payout_id. CHECK constraint enforces the invariant: `charge - gateway_fee - commission - (SELECT sum(amount) FROM adjustments) - refunded = rider_net` — enforced in-trigger as well as in the rules layer.
- **settlement_batches** — created_by (finance), amount, ledger ids, `status awaiting_approval|approved|rejected`, approved_by (admin, nullable), approved_at, reject_reason. **CHECK: created_by <> approved_by** (two-person rule in the database, not just the app).
- **payouts** — rider fk, amount, batch fk, provider ref, status.
- All money in **kobo integers**; never floats.

### Oversight (C-6, C-7)
- **disputes** / **dispute_events** — delivery fk, reason, description, opened_by, status; events record resolutions (outcome, refund amount, rider-share flag, **required note**, by_admin).
- **incidents** / **incident_events** — rider fk, kind sos|harassment|accident|unsafe_area|other, note, delivery fk nullable, status, events timeline. No penalty columns — penalties are separate, human decisions.
- **audit_log** — append-only: id, at, actor_id, action, target_type, target_id, reason, `before jsonb`, `after jsonb`. Insert-only grants; retained ≥ 24 months (see `docs/13`).

### Config (no-code-change pricing)
- **config_versions** — id, pricing jsonb, hours jsonb, policies jsonb, created_by, created_at, note. Every quote references the version used; changing pricing is an audit-logged admin action, never a deploy.

## 3. Migrations

`database/migrations/` — sequential, forward-only, each wrapped in a transaction:

- `001_init_core.sql` — users, otp, sessions, zones, landmarks, audit_log.
- `002_deliveries.sql` — deliveries, stops, events, codes, verification_attempts, tracking_tokens.
- `003_payments_ledger.sql` — payments, payment_events, ledger_records, invariant trigger.
- `004_riders.sql` — applications, review notes, profiles, availability.
- `005_oversight.sql` — disputes, incidents, settlement batches, payouts, config_versions, recurring plans.

Run with `psql -f database/migrations/NNN_*.sql` (or the deploy pipeline in `docs/16`). Every migration is idempotent (`IF NOT EXISTS`) and reversible only by a new forward migration.

## 4. Retention and privacy

| Data | Retention | Rationale |
|---|---|---|
| Rider ID documents | until application decision + 90 days, then delete | verification need only (NDPR minimisation) |
| Location points | active run + 7 days, then aggregate/delete | dispute window only |
| Package photos | delivery + 90 days | dispute evidence |
| Payment records | 6 years | financial record-keeping |
| Audit log | ≥ 24 months | oversight (C-7) |
| Verification attempts | 90 days | fraud analysis |
| OTP challenges | 24 h | ephemeral by design |

Subject access/erasure requests follow `docs/13` §6 (NDPR rights handling).

## 5. Prototype ↔ production parity

The engine's TypeScript types and the SQL schema are kept 1:1 by convention: field names, enums and status sets match exactly (`DeliveryStatus` in `types.ts` = `delivery_status` enum in `002`). When the schema changes, `src/engine/types.ts` changes in the same commit and the engine tests must stay green — that is the parity check.
