# ROOT-X API server

The authoritative backend for the ROOT-X prototype: a Fastify + `node:sqlite`
process that **owns the state** and runs the business-rules engine
(`../app/src/engine/core.ts`) as the single source of truth. The React app is a
networked mirror — it never decides anything.

```bash
npm install
npm run dev        # → http://localhost:4000  (NODE_OPTIONS=--experimental-sqlite)
```

Requires Node 22+ (`node:sqlite`). State persists to `data/rootx.db`
(gitignored); a corrupt or version-mismatched row re-seeds automatically.

## Why a real server

The founding brief requires the prototype to exercise the production trust
model instead of simulating it (`docs/19` D-12):

- **Server-authoritative** — every mutation goes through `POST /api/action`
  and the engine reducer; the client cannot inject state.
- **Actor injection** — the session cookie decides *who* is acting; `userId`
  fields inside action payloads are never trusted for auth.
- **Per-viewer redaction** — every response and every SSE frame passes through
  `viewerView()`: codes, quotes, payments, phones, audit, batches, payouts and
  pending OTPs are visible only to participants/staff.
- **Human-driven riders** — `simEnabled: false` server-side; simulated demo
  riders are parked and ineligible. A run moves only when a real rider session
  acts.
- **Server clock** — 1 Hz ticks run the gateway webhooks (payments, wallet
  top-ups), matching, safety-hours crossings and ledger transitions.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/action` | Dispatch one engine `Action`. Response: the viewer-redacted state. For `auth/otpRequest` the response includes the OTP **for the requester only** (docs/19 D-13). |
| `GET` | `/api/state` | Current viewer-redacted state. |
| `GET` | `/api/events` | SSE: `state` frames on change, `clock` ticks, 15 s heartbeat. |
| `GET` | `/api/guest/:token` | Minimal guest tracking view (no phones, no codes except the receiver's delivery code). `404` when unknown/revoked/expired. |
| `POST` | `/api/dev/reset` | Re-seed the world (prototype tool). |

Cookie: `rx_session` (httpOnly). Sessions are in-memory (prototype scope,
`docs/10`); state survives restarts via SQLite.

## End-to-end test

```bash
node scripts/e2e.mjs
```

Drives the whole journey over real HTTP with separate cookie sessions:
anonymous redaction → OTP sign-in + registration → booking → card payment
(webhook) → a real rider session driving the run with verification codes
(including a wrong-code rejection) → ledger ready → finance/admin two-person
settlement → wallet top-up lifecycle → rejected-action redaction → guest link.
37 checks; exits non-zero on any failure.

## Layout

```
src/index.ts        Fastify app: relay, redaction, SSE, ticks, persistence
data/rootx.db       SQLite state (gitignored)
scripts/e2e.mjs     multi-user HTTP end-to-end suite
```
