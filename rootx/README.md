# ROOT-X

**Campus delivery, logistics and student-rider platform for UNIOSUN (Osun State University), Osogbo, Nigeria.**

This repository contains a **working prototype** (all roles, all flows, tested business-rules engine), the **production specifications** (database, API, architecture, security), and the **operational documentation** (admin, safety, launch). Demo data only — no real payments.

> ⚠️ **Honesty first.** Brand identity, commission, final pricing, payment provider, insurance and any university affiliation are **unresolved by design** and tracked in [`docs/19-assumptions-risks-decisions.md`](docs/19-assumptions-risks-decisions.md). Nothing in this codebase may be presented as a final business decision or a compliance claim.

## What's inside

```
rootx/
├── app/                  # Working prototype (React + TypeScript + Vite)
│   ├── src/engine/       # ★ Business-rules engine — the heart of the product.
│   │   │                 #   Pure, tested rules that the production API will
│   │   │                 #   import as-is: state machine, safety hours, pricing,
│   │   │                 #   matching, verification, zones/geofencing, ledger.
│   │   └── *.test.ts     #   8 test files / 54 tests, incl. full-journey
│   ├── src/pages/        # customer, guest, rider, admin (ops/finance/security)
│   ├── src/ds/           # design system (tokens + primitives)
│   └── src/components/   # schematic campus map, timeline, demo controls
├── database/
│   ├── schema.sql        # authoritative PostgreSQL 15 + PostGIS DDL
│   └── migrations/       # forward-only, dependency-ordered migrations
├── api/
│   └── openapi.yaml      # OpenAPI 3.1 specification
└── docs/                 # 20 deliverables — see docs/README.md
```

## Quick start (prototype)

Requires Node 18+.

```bash
cd rootx/app
npm install
npm run dev        # → http://localhost:5173 (binds 0.0.0.0)
```

Other commands:

```bash
npm test           # 54 engine + journey tests (vitest)
npm run build      # typecheck + production build
npm run preview    # serve the production build
```

The prototype is self-contained: no backend, no keys, no network services. The
engine runs client-side and the state persists in your browser (localStorage).

### Demo accounts (quick login)

| Role | Account |
|---|---|
| Customer (sender) | Ada / Tunde / Chidi / Amaka |
| Rider (verified, simulated) | Kofi / Ibrahim / Blessing |
| Admin (ops) | Mrs. Bello |
| Finance | Mr. Adeyemi |

Use **Quick login** on the login screen. Staff roles require the MFA step (demo code shown on screen).

### Things to try

- Book a delivery end-to-end (wizard → quote → pay → watch a simulated rider complete it with codes).
- Open the **receiver link** in a private tab — then **revoke** it and refresh.
- Use **Demo controls** (top bar) to toggle GPS loss (stale location rendering), offline mode, and forced payment failure — the UI never fakes success.
- Advance the **clock** past 18:00 / 21:00 to see the safety phases (warning → booking cutoff → closure with active deliveries resolving safely).
- In admin: approve a rider application, change pricing (rider-net preview included), propose a settlement batch as finance, approve it as admin.
- Raise an SOS as a rider and resolve it as admin — note there is no penalty path anywhere.

## The nine non-negotiables (implemented + tested)

1. **Verified student riders only** — applications with matric + ID upload, manual approval, never eligible before approval, duplicate protection.
2. **Approved zones only** — campus + defined student-township polygons; eligibility decided server-side; inter-zone policy configurable; no statewide mode exists.
3. **Safety hours** — 6 PM warning, 9 PM new-delivery cutoff (ETA + buffers), safe resolution of in-flight runs, 24/7 emergency reporting.
4. **Permission-aware tracking** — location shared only during active runs; private, revocable, time-limited guest links; verified pickup/delivery codes with lockouts and audit records.
5. **Auditable money** — per-delivery ledger with a hard invariant, refund accounting, two-person settlement.
6. **No automated penalties** — proportionate temporary safeguards only; humans resolve with audited notes; appeals.
7. **Server-side admin powers** — role-gated actions, append-only audit log, permissions enforced in the rules layer, not by hiding UI.
8. **Honest states** — stale location is labelled stale; unconfirmed payment is never success; offline never fakes success.
9. **Privacy, accessibility, secure development, legal review** — designed in (see docs 13, 19, 20).

## Documentation

Start with [`docs/README.md`](docs/README.md) — 20 deliverables covering PRD, stories, architecture, database, API, auth, payments, mapping, security, safety, testing, deployment, backup/IR, admin operations, launch checklist, and the assumptions/risks/decisions register.

## Database setup (production spec)

```bash
psql "$DATABASE_URL" -f database/migrations/001_init_core.sql
psql "$DATABASE_URL" -f database/migrations/002_deliveries.sql
psql "$DATABASE_URL" -f database/migrations/003_payments_ledger.sql
psql "$DATABASE_URL" -f database/migrations/004_riders.sql
psql "$DATABASE_URL" -f database/migrations/005_oversight.sql
```

Requires PostgreSQL 15+ with PostGIS. `schema.sql` is the consolidated view; migrations are the apply path. See `docs/08`.

## Status

Prototype complete and green (typecheck ✓ · 54/54 tests ✓ · build ✓). Production build-out follows the phase gates in `docs/20`.
