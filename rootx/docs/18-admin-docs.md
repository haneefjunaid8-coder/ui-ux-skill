# 18 — Administrator and Operations Documentation

Audience: ops admins, finance staff, security staff. Everything below is also discoverable in-app (the admin shell); this is the training and reference document.

## 1. Roles and what they mean

| Role | Can | Cannot |
|---|---|---|
| **Admin/Ops** | review rider applications, monitor deliveries, manage zones/pricing, resolve disputes, approve settlements, suspend accounts (audited, appealable) | propose settlements; edit audit log; bypass safety hours |
| **Finance** | view ledgers/reconciliation, propose settlement batches, export CSV | approve own (or any) batch — admin approves; manage riders/zones |
| **Security** | view and resolve safety incidents with audited notes | touch money, pricing or riders |

Staff accounts always require MFA. Every privileged action lands in the audit log with actor, reason, before/after.

## 2. Daily operating rhythm (service hours 08:00–21:00)

| When | Task |
|---|---|
| 07:45 | Check overnight: incidents, failed payments, applications queue, backup status |
| 08:00 | Zones active; service window opens (automatic) |
| Ongoing | Watch ops overview: unassigned queue > 10 min → investigate rider availability; verification lockouts → call parties; SOS → acknowledge ≤ 5 min |
| 18:00 | Safety warning fires automatically; scan in-flight deliveries for ETA-vs-closure risk |
| 20:15 | Closure pre-check: list deliveries that cannot complete by 21:00 + their safe-resolution path |
| 21:00 | Closure fires; confirm every in-flight delivery has a safe resolution owner |
| Daily | Dispute triage; application decisions (SLA 48 h); finance reconciliation review |

## 3. Rider application review (C-1) — checklist

1. Open `/admin/applications` → the submitted application.
2. Verify (evidence attached): full name matches student ID; **matric number** is valid format and not a duplicate; photo of ID is unaltered; phone reachable; emergency contact plausible; transport method and zone make sense.
3. Decision:
   - **Approve** → rider profile created (capacities from transport). Note required (what you verified).
   - **Reject** → note required (which check failed). Applicant sees the decision and may appeal via support.
4. Red flags → escalate to security review instead of rejecting outright: ID tampering, duplicate matric with different names, mismatched photos.
5. Every decision is audit-logged. Decisions are spot-audited weekly by a second admin.

**Never** approve to clear a queue. An unapproved applicant cannot receive offers by construction — but a wrong approval can.

## 4. Zone and pricing management

- `/admin/zones`: activate/deactivate zones, set inter-zone policy (`intra_zone_only` default). Deactivation stops new bookings instantly; active deliveries continue. Zone edits require a reason (audit-logged).
- `/admin/pricing`: change fares, fees, commission, hours, buffers. **Preview shows the rider net for a sample run** (total − gateway fee − commission) before you save. New quotes use the new config immediately; existing deliveries keep the config they were quoted with (quote stored on the delivery).
- Golden rule: **no pricing change without a finance consult** — even though the system allows it.

## 5. Finance operations (C-5)

1. `/admin/finance` — review the reconciliation summary. **If any ⚠ is open, settlement runs are blocked** — resolve the mismatch first (compare gateway dashboard to ledger; open a case if unexplained).
2. **Propose settlement** (finance role): creates a batch `awaiting_approval` from all `ready` ledgers. You cannot approve it — hand off to an admin.
3. Admin approves (or rejects with reason). Riders see payouts move to available.
4. CSV export for the bank/provider reconciliation; archive per retention policy.
5. Refunds happen only through dispute resolution (explicit rider/platform split) or cancellations (fee stages) — there is no free-form money edit, by design.

## 6. Cases: disputes and safety incidents

### Disputes
- Triage: is this safety or commercial? Safety → also open an incident.
- Resolve with: outcome (from the standard list), refund amount, **who funds it** (rider share / platform share), and a **note a third party could read** — it is the audit record.
- Evidence packs: delivery timeline, verification attempts, photos, ledger — auto-attached.

### Safety incidents (C-6)
- Acknowledge ≤ 5 min; contact per the escalation tree.
- You may apply **temporary, proportionate safeguards** (pause new offers, mask contact) — they auto-expire and are reviewed.
- **You may not apply penalties as part of incident handling.** Suspensions are separate decisions with evidence and an appeal path.
- Resolution requires an audited note; "escalated — security review" is a valid outcome when unsure.

## 7. Audit log (`/admin/audit`)

Append-only. Filter by actor, action, target, date. Use it to answer: *who changed pricing on Tuesday? who approved rider X? who resolved case Y and why?* If an action isn't in the log, it didn't happen (report it as a SEV-2).

## 8. Common situations playbook

| Situation | Do |
|---|---|
| Rider marked "arrived" but sender says no | Timeline shows GPS + timestamps; call both; if unverifiable → treat as failed attempt, run the return-to-sender path |
| Code lockout with locked-out party | Wait out the 10 min lockout with both parties on the line; never share a code over admin channels |
| Delivery can't finish by 21:00 | Choose safe resolution: complete / verified return / supervised cancel (fee waived if safety) |
| Payment succeeded, gateway says failed (or vice versa) | Do NOT hand-edit anything; open the mismatch case; finance reconciles with the provider; ledger invariant protects the books |
| Guest complains link doesn't work | Check revoked/expired/rotated in delivery detail; sender issues a fresh link |
| Allegations against a rider | Incident workflow; safeguards temporary; evidence first; no penalty before a person decides |
| Zone flooding / campus closure | Deactivate affected zones; broadcast notice; active runs to safe resolution |

## 9. Access reviews (quarterly)

- List staff accounts + roles; confirm still needed; remove stale sessions.
- Sample 10 audit entries per admin → verify reasons are meaningful.
- Verify MFA is enrolled for all staff.
- Sign-off recorded (audit log entry `access.review`).

## 10. Escalation contacts

Maintained in-app (admin settings) and printed in the runbook: campus security liaison, emergency services, gateway provider, hosting provider, counsel. See `docs/17` §4.
