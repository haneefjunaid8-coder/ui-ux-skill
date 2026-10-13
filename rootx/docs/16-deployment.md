# 16 — Deployment and Configuration

## 1. Environments

| Env | Purpose | Data |
|---|---|---|
| `local` | development | seed/demo data |
| `staging` | integration, E2E, pen-test | synthetic data only |
| `production` | pilot | real data |

Promotion: `local → staging` automatic on PR merge; `staging → production` is a tagged release with the launch checklist (`docs/20`).

## 2. Topology (per `docs/07` §5)

- **App tier:** containers (web PWA static + API modules) behind a load balancer, 2+ replicas, health checks `/healthz` (liveness) and `/readyz` (DB/Redis connectivity).
- **Data:** managed PostgreSQL 15 + PostGIS (primary + standby, PITR), managed Redis, object storage (private buckets), CDN.
- **Workers:** matching, settlement, payouts, notification dispatch (same image, different entrypoints).
- **Observability:** metrics (Prometheus-class), structured logs (no PII), traces on money paths, uptime probes, alerting to on-call (see `docs/17`).

## 3. Configuration (all via environment — never in code)

| Variable | Scope | Notes |
|---|---|---|
| `DATABASE_URL` | API/workers | Postgres DSN |
| `REDIS_URL` | API/workers | queues, locks, counters |
| `OBJECT_STORE_*` (endpoint, bucket, keys) | API | photos + ID documents (private) |
| `JWT_SECRET` / `JWT_KID` | API | rotate quarterly; old kid accepted 24 h |
| `SMS_PROVIDER_KEY` | API | OTP delivery |
| `PAYMENT_GATEWAY_KEY` / `PAYMENT_WEBHOOK_SECRET` | payments svc | rotate on provider change; secret manager |
| `PAYOUT_PROVIDER_KEY` | payments svc | |
| `MAP_TILE_URL` / `MAP_TILE_KEY` | web | CDN fronted |
| `ROUTING_URL` | matching | OSRM/Valhalla endpoint |
| `SENTRY_DSN` | all | error tracking |
| `BASE_URL`, `API_URL` | web | public URLs |
| `NODE_ENV` / `LOG_LEVEL` | all | |

Secrets live in a managed secret store; CI injects them at deploy time; nothing sensitive in git (scanned).

**Pricing/commission/hours/zones are NOT env vars** — they are admin-managed `config_versions` rows (audit-logged) so changes never require a deploy (C-7).

## 4. Deploy procedure

```
1. CI green (tests, migrations dry-run, scans) on the release tag.
2. Backup check: latest PITR window verified (docs/17).
3. Apply migrations (forward-only, transactional, idempotent).
4. Roll out app tier (rolling, health-gated; zero-downtime).
5. Smoke: /healthz, /readyz, book→pay(test gateway)→verify→cancel, admin login.
6. Monitor error budget for 30 min; auto-rollback on failed health gates.
```

Rollback: app tier rolls back to the previous image; **database migrations never auto-roll back** — a forward-fix migration is the only path (schema changes are additive for two releases before dropping anything).

## 5. Client releases

- **PWA:** static build on CDN; deploy = upload; instant.
- **Native shells (post-pilot):** staged rollout 10 % → 50 % → 100 % with crash-rate gates; minimum supported version enforced via remote config (force-update screen below it).

## 6. Zero-downtime notes

- Migrations additive-first (new nullable columns; backfill job; then code uses them; then cleanup release).
- Feature flags for risky paths (matching v2, new gateway) — flags are config rows, audit-logged.
- WebSocket clients reconnect with backoff and replay from `lastEventId`.

## 7. Demo/prototype deployment (this repository)

```
cd rootx/app
npm install
npm run dev        # dev server, binds 0.0.0.0:5173 (sandbox-preview friendly)
npm run build      # tsc -b && vite build → dist/
npm run preview    # serve the production build
npm test           # 54 tests
```

The prototype persists state in the browser (localStorage) and needs no backend — the rules engine runs client-side with the same code that the production API will import.
