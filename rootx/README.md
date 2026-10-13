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
│   │   └── *.test.ts     #   8 test files / 56 tests, incl. full-journey
│   ├── src/pages/        # customer, guest, rider, admin (ops/finance/security)
│   ├── src/ds/           # design system (tokens + primitives, Campus Neon dark)
│   └── src/components/   # Leaflet/OSM live map, timeline, network badge
├── server/               # ★ Real API: Fastify + SQLite, sessions, SSE,
│                         #   per-viewer redaction, server clock. The engine
│                         #   runs HERE — the app is a networked mirror.
├── landing/              # 3D interactive marketing concept (see below)
├── database/
│   ├── schema.sql        # authoritative PostgreSQL 15 + PostGIS DDL
│   └── migrations/       # forward-only, dependency-ordered migrations
├── api/
│   └── openapi.yaml      # OpenAPI 3.1 specification
└── docs/                 # 20 deliverables — see docs/README.md
```

### Landing concept (`landing/`)

A 3D interactive marketing page generated with the
[`modern-3d-uiux-gpt3` skill](../modern-3d-uiux-gpt3-skill/) (GPT-3-style dark
gradient design language + WebGL). It is a **design exploration** — brand and
copy are exploratory per `docs/19` A-2, and the page carries the required
no-affiliation disclaimer.

```bash
cd rootx/landing
npm install
npm run dev        # → http://localhost:5174 (the prototype app runs on 5173)
```

## Quick start (prototype)

Requires Node 22+ (the server uses `node:sqlite`). Build the app once, then
run the server — it serves **the compiled, installable PWA and the API from
one origin**:

```bash
# 1 — compile the app (typecheck + production build → app/dist)
cd rootx/app
npm install
npm run build

# 2 — the server: API + app shell on one origin
cd ../server
npm install
npm run dev        # → http://localhost:4000  (open this — it's the app)
```

For hot-reload development instead: `npm run dev` in `rootx/app`
(→ http://localhost:5173, proxies `/api` → :4000).

### Install it on your phone (PWA)

Open the server's URL on your phone and install ROOT-X like a native app:

- **Android / Chrome** — tap **Install app** in the address bar (or ⋮ → *Add to Home screen*).
- **iPhone / Safari** — Share → **Add to Home Screen**.

You get a standalone window, the ROOT-X icon (Campus Neon dark mark), and an
app that keeps working offline: the shell and map tiles are cached by the
service worker, actions queue honestly and replay when the connection returns,
and payments/verification always wait for the server — nothing is faked.

Sign in with phone + OTP — there is no SMS gateway in the prototype, so the
6-digit code is shown in the app (returned only to the requester, redacted
everywhere else; see `docs/19` D-13). The seeded accounts are also one tap
away on the sign-in screen.

Other commands:

```bash
npm test           # 56 engine + journey tests (vitest)
npm run build      # typecheck + production build
node scripts/e2e.mjs   # (server/) full multi-user journey over real HTTP —
                       # two human sessions, payment webhook, codes, settlement
```

### Accounts (seeded world)

| Role | Account |
|---|---|
| Customer (sender) | Ada · Tunde · Amaka |
| Rider (verified, human-driven) | Chidi |
| Admin (ops) | Mrs. Bello |
| Finance | Mr. Adeyemi |

Staff roles require MFA after OTP (prototype code shown on screen). **Riders are
never simulated**: seeded demo riders are parked and ineligible; a delivery only
moves when a real rider session (Chidi) accepts and drives it.

### Things to try (multi-tab, real sessions)

- Open **two browser profiles** (or a normal + private window): sign in as **Ada** (customer) in one and **Chidi** (rider) in the other.
- As Ada: book a delivery (wizard → quote → pay by card) and watch it move to *finding a rider* when the gateway webhook confirms.
- As Chidi: accept the offer, drive the run — approach, arrive, **ask Ada for her pickup code** (she reads it from her app), collect, transit, arrive, get the delivery code from the receiver link.
- Open the **receiver link** in a third tab — live map, status timeline, delivery code — then **revoke** it as Ada and refresh.
- Top up Ada's **wallet** (card or transfer — it credits when the webhook lands) and pay a delivery from it.
- In admin: approve a rider application, change pricing (rider-net preview included), propose a settlement batch as finance, approve it as admin — two-person rule enforced by the server.
- Raise an SOS as a rider and resolve it as admin — note there is no penalty path anywhere.
- Kill the server and keep using the app: actions queue with an honest offline banner and replay when it returns (payments and code checks never fake success).

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

Prototype complete and green (typecheck ✓ · 56/56 engine tests ✓ · 37-check HTTP E2E ✓ · build ✓). Production build-out follows the phase gates in `docs/20`.
