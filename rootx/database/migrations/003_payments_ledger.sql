-- =====================================================================
-- ROOT-X migration 003 — payments, ledgers, settlement (two-person rule),
-- payouts. Requires 001, 002.
-- =====================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES deliveries(id),
  method payment_method NOT NULL,
  amount_kobo bigint NOT NULL CHECK (amount_kobo > 0),
  status payment_status NOT NULL DEFAULT 'initiated',
  gateway_ref text,
  idempotency_key text NOT NULL UNIQUE,          -- webhook replays are safe
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_events (      -- append-only
  id bigserial PRIMARY KEY,
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  status payment_status NOT NULL,
  note text,
  at timestamptz NOT NULL DEFAULT now()
);
REVOKE UPDATE, DELETE ON payment_events FROM app_rw;

CREATE TABLE IF NOT EXISTS settlement_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES users(id),           -- finance
  created_at timestamptz NOT NULL DEFAULT now(),
  amount_kobo bigint NOT NULL,
  ledger_ids uuid[] NOT NULL,
  status batch_status NOT NULL DEFAULT 'awaiting_approval',
  approved_by uuid REFERENCES users(id),                   -- admin
  approved_at timestamptz,
  reject_reason text,
  -- two-person rule in the database, not just the app
  CONSTRAINT two_person CHECK (approved_by IS NULL OR approved_by <> created_by)
);

CREATE TABLE IF NOT EXISTS payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL,  -- FK added in 004 (rider_profiles) via late_rider_fk
  amount_kobo bigint NOT NULL CHECK (amount_kobo > 0),
  batch_id uuid REFERENCES settlement_batches(id),
  provider_ref text,
  status payment_status NOT NULL DEFAULT 'initiated',
  requested_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE TABLE IF NOT EXISTS ledger_records (
  delivery_id uuid PRIMARY KEY REFERENCES deliveries(id),
  charge_kobo bigint NOT NULL,
  gateway_fee_kobo bigint NOT NULL,
  commission_kobo bigint NOT NULL,
  adjustments jsonb NOT NULL DEFAULT '[]',       -- [{label, amount (signed)}]
  refunded_kobo bigint NOT NULL DEFAULT 0,
  rider_net_kobo bigint NOT NULL,
  settlement ledger_settlement NOT NULL DEFAULT 'pending',
  settled_at timestamptz,
  payout_id uuid REFERENCES payouts(id),
  -- the invariant, enforced by the database itself
  CONSTRAINT ledger_invariant CHECK (
    charge_kobo - gateway_fee_kobo - commission_kobo
      - (SELECT COALESCE(sum((a->>'amount')::bigint),0) FROM jsonb_array_elements(adjustments) a)
      - refunded_kobo = rider_net_kobo
  )
);

COMMIT;
