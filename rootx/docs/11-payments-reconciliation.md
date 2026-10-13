# 11 — Payments and Reconciliation Design

## 1. Money principles

1. **Never trust the client, never trust hope** — a payment is `succeeded` only via a signature-verified gateway webhook (C-8).
2. **Every kobo has one truth** — the per-delivery ledger record with a hard invariant.
3. **No single person moves money** — two-person settlement (finance proposes, admin approves).
4. **Integer math only** — all amounts in kobo; no floats, ever.
5. **Commission is configuration, not code** — the percentage is a documented configurable default; the final figure is a founder decision (`docs/19` U-1).

## 2. Payment flow

```
Sender pays (card / bank transfer / wallet)
  │
  ├─ POST /deliveries/{id}/pay  (Idempotency-Key)
  │    → payment created: initiated → processing
  │    → delivery status: payment_processing   ← honest UI: "processing"
  │
  ├─ wallet: internal ledger check → instant event (still event-driven)
  ├─ card/transfer: gateway checkout ref returned
  │
  ▼
Gateway webhook (signature-verified, idempotent by key)
  ├─ succeeded → ledger row built (invariant-enforced) → awaiting_rider → matching
  └─ failed    → delivery returns to awaiting_payment; "no money was taken"
                 retry allowed; nothing downstream ever saw the money
```

Failed-webhook handling: reconciliation job compares gateway records to platform payments; mismatches surface in `/admin/finance` with ⚠ flags — never auto-resolved.

## 3. The ledger invariant (C-5)

For every delivery:

```
charge − gatewayFee − commission − Σ adjustments − refunded = riderNet
```

- `charge` — what the sender paid (the accepted quote, kobo).
- `gatewayFee` — `gatewayFeeFixed + gatewayFeePct × charge` (configurable).
- `commission` — `commissionPct × charge` (configurable; **placeholder 15 %, unresolved**).
- `adjustments` — signed entries, e.g. dispute refunds absorbed by the platform (`−amount` puts money back into the rider pot).
- `refunded` — total returned to the customer.
- `riderNet` — what the rider has earned, pending settlement.

The invariant is asserted:
1. in the rules layer on every write (`assertLedgerInvariant`),
2. as a DB CHECK constraint (`database/migrations/003`),
3. as a visible ✓/⚠ column in the finance UI,
4. by tests (`ledger.test.ts`, `journey.test.ts`).

### 3.1 Refund accounting
A refund is split explicitly: **rider share** (rider's net reduced by their portion; the `refunded` term carries it) and **platform share** (a negative adjustment returns the platform's portion to the rider pot). The chosen split is recorded in the dispute resolution with the resolver's note. Cancellation fees follow the same mechanism (`delivery.cancel` adjustment).

### 3.2 Worked example
₦2,000 charge: gateway fee ₦130 (₦100 + 1.5 %), commission ₦300 → rider net ₦1,570.
Dispute refund ₦500, rider share: rider net ₦1,070; refunded ₦500; adjustment 0.
Check: 2000 − 130 − 300 − 0 − 500 = 1070 ✓
Same refund, platform share: rider net stays ₦1,570; adjustment −500.
Check: 2000 − 130 − 300 − (−500) − 500 = 1570 ✓

## 4. Settlement (two-person rule)

```
Delivery delivered → ledger settlement = pending
Ledger ready (post-delivery checks) → settlement = ready
Finance: POST /admin/finance/settlement-runs
   → batch { ledgers, amount, status: awaiting_approval }
   → ledgers marked settled (payout pending approval)
Admin (≠ proposer): approve → payouts issued to riders' payout accounts
                   reject (reason required) → batch reverts, ledgers back to ready
```

- The proposer **cannot** approve their own batch — enforced in the API *and* a DB CHECK (`created_by <> approved_by`).
- Payout minimum per rider (`payoutMinAmount`, default ₦2,000 — configurable).
- Batch content and both actors are audit-logged; CSV export for bank/provider reconciliation.

## 5. Wallet

- Top-up via gateway (same webhook discipline); wallet balance is kobo-integers.
- Recurring plans auto-debit from wallet; insufficient balance pauses the plan (never a partial charge).
- Wallet debits are payments with `method=wallet` and full event trails — they reconcile like any other payment.

## 6. Reconciliation operations (daily/weekly)

| Check | Method | On mismatch |
|---|---|---|
| Gateway settled vs platform succeeded | export compare (provider dashboard vs `/admin/finance/export.csv`) | ⚠ flag, manual case, no auto-write |
| Ledger invariant | automated assertion on every row + batch report | blocks settlement run |
| Payouts sent vs provider confirmations | webhook + provider statement | hold next batch for that rider |
| Refunds vs gateway refund APIs | provider report vs ledger `refunded` | ⚠ flag, case |

Settlement batches are **never** created while any ⚠ is open — the finance UI blocks the run with the reason.

## 7. Refund and fee policy defaults (all configurable)

| Item | Default | Notes |
|---|---|---|
| Cancellation before rider assigned | full refund | stage table in `ServiceHoursConfig` |
| Rider assigned, en route to pickup | fee ₦200 (configurable stage) | |
| At pickup / verifying | fee ₦400, rider partially compensated | |
| Collected / in transit | fee ₦700, rider compensated | |
| Safety-motivated cancellation | **fee ₦0, always** | pattern-matched reason + human review path |
| Dispute refund | resolver's decision with explicit split | audited note required |

These are **documented configurable defaults** — the final schedule requires founder sign-off (see `docs/19` U-1).

## 8. Provider posture (unresolved, tracked)

No payment provider is finalized. Evaluation criteria (documented for the decision): webhook quality + idempotency, transfer/PBT support, Nigeria campus-user familiarity, fees, settlement cadence, dispute tooling. The integration is isolated behind one service interface (`Payments service`, `docs/07`) so the provider can change without touching the rules layer.
