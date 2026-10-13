# 14 — Safety and Incident Workflows

Safety is a product constraint, not a feature. This document specifies the hours policy, the in-run safety tools, and the human incident workflows (C-3, C-6).

## 1. Service hours policy (C-3)

| Time (configurable) | Behaviour |
|---|---|
| 08:00 — 17:59 | Normal service |
| **18:00** | **Safety warning broadcast** — all users notified; banner in-app; "plan to finish before dark" |
| 18:00 — 20:59 | Bookings accepted **only if completable**: `now + ETA + handlingBuffer (15 min) + cutoffBuffer (45 min) ≤ 21:00` |
| **21:00** | **New-delivery closure** — new bookings, new offers and new assignments stop; active deliveries continue to safe resolution |
| 21:00 — 07:59 | Emergency reporting (SOS) remains fully available |

**Safe resolution at closure** — an in-flight delivery resolves by one of:
1. normal completion (codes verified);
2. verified return-to-sender (package back at pickup with the sender's code);
3. supervised cancellation by ops (admin action, audited, with fee waived if safety-related).

Nothing is force-cancelled automatically; the rider dashboard shows explicit guidance ("complete or return — you will not be penalised for a safety stop").

All values (`openHour`, `warningHour`, `closeHour`, buffers) are config, not code; changes are admin actions, audit-logged, and take effect immediately.

## 2. In-run safety tools

### 2.1 Rider SOS
One tap from the active-run screen (fixed position, large target): kinds `sos / harassment / accident / unsafe_area / other` + note. Effects: incident record opens with an event timeline; ops/security notified immediately (push + dashboard queue); the delivery is flagged; **no automatic penalty to anyone** (C-6).

### 2.2 Sender/receiver reporting
`Report a problem` on the delivery detail: opens a dispute case with the full delivery context (events, verification attempts, photos) attached automatically.

### 2.3 Right of refusal
Riders may decline any offer without penalty and may refuse a package at pickup if contents contradict the declaration (prohibited/unsafe) — the delivery returns to matching with the reason recorded and the sender's declaration audited.

### 2.4 Safety-motivated cancellation
Cancellation reasons matching safety patterns (or any cancellation flagged by an admin as safety-related) waive the fee for both parties and are excluded from any penalty metrics — enforced in the rules layer and tested (`stateMachine`/`safety` tests).

## 3. Incident workflow (human, always)

```
1. DETECT      SOS / report / monitoring alert → incident (or dispute) record
               with full context attached automatically.
2. TRIAGE      Ops queue (SLA: acknowledge ≤ 5 min during service hours;
               SOS acknowledges immediately 24/7).
3. SAFEGUARD   Proportionate + temporary only (pause new offers, hold matching,
               mask contact). Every safeguard auto-expires and is listed
               for review. NO automated penalties — ever (C-6).
4. INVESTIGATE Timeline, verification attempts, photos, ledger, locations
               (retention window), statements from both parties.
5. RESOLVE     Admin or security staff records a MANDATORY audited note.
               Outcomes: no-fault close, warning (separate from ratings),
               refund path (disputes), escalation to campus security,
               account action (suspension — appealable, human-only).
6. FOLLOW-UP   Subject notified; appeal path opens a linked case;
               pattern review weekly (aggregates, no individual auto-action).
```

### 3.1 Escalation contacts
Campus security liaison and emergency numbers are configured per campus (admin-managed). Escalation from the platform is a phone call plus an in-platform record — the record never *is* the escalation.

### 3.2 Disputes vs incidents
- **Dispute** = commercial disagreement (damage, lateness, fee) → resolution may include refunds (ledger-adjusted) — `docs/11` §3.1.
- **Incident** = safety event (harassment, accident, unsafe area) → resolution is about people; money only via a linked dispute.
One delivery can have both; they link by `delivery_id`.

## 4. Anti-abuse of the safety system (C-6 both directions)

| Abuse | Response (human, proportionate) |
|---|---|
| Repeated false SOS | Review with evidence; warning; account action only after pattern confirmed by a person |
| Bad-faith reports against a rider | Same review discipline; the rider's record is not touched by unresolved reports |
| Reports used to harass (repeated against one target) | Pattern detection → admin review → reporter suspension with appeal |
| Using SOS for non-emergencies | Guidance + education first; no penalty on first instances |

**Invariant:** no automated system applies a penalty. Safeguards are temporary, listed, and expire. This is code-enforced (no penalty pathway exists in the rules layer) and stated in admin training (`docs/18`).

## 5. Metrics

| Metric | Target |
|---|---|
| SOS acknowledged | ≤ 5 min, 24/7 |
| Safety incidents resolved ≤ 24 h | ≥ 95 % |
| Post-21:00 new bookings (excl. emergency) | 0 |
| In-flight deliveries at 21:00 reaching safe resolution ≤ 60 min | ≥ 99 % |
| Safety cancellations penalised (any reason) | 0 — hard check in weekly review |

## 6. Prototype implementation

`src/engine/safety.ts` (window evaluation, warnings, closure, grace), `rider/sos` + `admin/resolveIncident` + `admin/resolveDispute` actions with mandatory notes, event timelines in `Cases.tsx`, no-penalty banners, and tests in `safety.test.ts` + `journey.test.ts` (SOS → resolution → audit; safety cancellation fee-waived).
