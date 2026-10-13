# 17 — Backup, Recovery and Incident Response

## 1. Backup policy

| Asset | Method | RPO | RTO | Retention |
|---|---|---|---|---|
| PostgreSQL | managed PITR (WAL) + daily snapshots | ≤ 5 min | ≤ 30 min | 35 days PITR, 12 monthly |
| Object storage (photos, ID docs) | versioned buckets + cross-region replication | ≤ 15 min | ≤ 1 h | object lifecycle per `docs/08` §4 |
| Redis | not backed up (cache/queue only; rebuilt from Postgres) | n/a | rebuild | n/a |
| Config rows (pricing/zones) | in Postgres + exported JSON per change | ≤ 5 min | ≤ 30 min | forever (versioned) |
| Audit log | Postgres PITR + monthly immutable export to object storage (WORM) | ≤ 5 min | ≤ 30 min | ≥ 24 months |
| Secrets | secret store (managed redundancy) | provider SLA | ≤ 15 min | — |

**Restore drills:** full restore to staging monthly (timed, signed off); partial-table restore quarterly. A backup that has never been restored is not a backup.

## 2. Recovery procedures

### 2.1 Database failover
1. Managed standby promoted (automatic on health failure).
2. App tier reconnects (pooled); in-flight transactions fail loudly — never silently retried into the wrong state (C-8).
3. Post-recovery reconciliation: payment mismatch job + ledger invariant sweep before settlement runs resume.

### 2.2 Region loss (worst case)
1. Restore latest snapshot + WAL to the secondary region.
2. Repoint DNS (TTL pre-lowered to 60 s).
3. Verify invariant sweep + audit-log continuity; then open service.
4. Accepted pilot posture: up to 1 h data loss window if cross-region replication lag exceeds PITR — documented, accepted (see `docs/13` §8).

### 2.3 Bad deploy / bad data
1. Roll back app tier (`docs/16` §4).
2. Data fixes only via **forward migration** with review; the ledger invariant CHECK blocks inconsistent writes.
3. Post-mortem within 48 h; action items tracked as issues.

## 3. Incident response

### 3.1 Severity ladder

| Sev | Definition | Response |
|---|---|---|
| **SEV-1** | Safety incident involving people; or money loss; or data exposure | Page on-call + founder now; acknowledge ≤ 5 min; war room |
| **SEV-2** | Core journey down (booking/payments/matching); no safe workaround | Page on-call; acknowledge ≤ 15 min |
| **SEV-3** | Degraded (stale maps, slow notifications) with workaround | Business hours |
| **SEV-4** | Cosmetic/minor | Next sprint |

**People safety always outranks system integrity** — if a safety incident is in progress (SOS unresolved), system work pauses unless it directly aids the response (C-3/C-6 culture).

### 3.2 Lifecycle
```
DETECT (alert / SOS / report)
  → ACKNOWLEDGE (on-call, SLA above)
  → CONTAIN (feature freeze, session revocation, payment hold; never delete evidence)
  → COMMUNICATE (status page; in-app banner; affected users directly for SEV-1/2)
  → ERADICATE (fix, patch, rotate secrets)
  → RECOVER (verify with smoke tests + invariant sweeps)
  → POST-MORTEM (blameless, 48 h, public summary for SEV-1/2, action items with owners)
```

Evidence preservation: audit log, delivery_events, verification_attempts, payment_events are append-only — responders must not "clean up" data as part of recovery.

### 3.3 Security incident specifics
- Rotate affected secrets/keys first (JWT kid, webhook secrets, provider keys).
- Preserve logs before any restart; snapshot affected volumes.
- NDPR breach assessment: if personal data is exposed, notify the regulator **within 72 hours** and affected data subjects without undue delay (counsel-owned — `docs/19` U-4).
- Coordinate disclosure timing with counsel; never speculate publicly.

### 3.4 Safety incident specifics (people)
- Follow `docs/14` workflow; the on-call ops lead owns contact with campus security.
- Emergency services are called by the humans involved — the platform's job is fast, accurate context (location, participants, timeline) and an audited record.

## 4. On-call and contacts

- Pilot: founder + 1 ops lead rotate; documented escalation tree (ops → founder → counsel → campus security liaison).
- Contact sheet (admin-managed, printed copy in the runbook): campus security, gateway provider, hosting provider, counsel, DBA.
- Weekly ops review covers: SEV count, SLA adherence, invariant sweep results, restore-drill status.

## 5. Runbook artifacts to maintain (pre-pilot)

- [ ] Printed contact sheet + escalation tree
- [ ] Restore drill instructions (DB, object storage, region)
- [ ] Payment-provider incident contacts and dashboard paths
- [ ] NDPR breach notification template (counsel-reviewed)
- [ ] Status page + in-app banner texts (pre-approved)
- [ ] Post-mortem template
