-- =====================================================================
-- ROOT-X migration 002 — deliveries, stops, events, codes, tracking,
-- recurring plans. Requires 001.
-- =====================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS recurring_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES users(id),
  template jsonb NOT NULL,                       -- stops, package, transport
  days int[] NOT NULL CHECK (array_length(days,1) BETWEEN 1 AND 7),
  time time NOT NULL,
  active bool NOT NULL DEFAULT true,
  next_occurrence timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recurring_occurrences (
  plan_id uuid REFERENCES recurring_plans(id) ON DELETE CASCADE,
  planned_for timestamptz NOT NULL,
  delivery_id uuid REFERENCES deliveries(id),
  skipped bool NOT NULL DEFAULT false,
  PRIMARY KEY (plan_id, planned_for)
);

CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE,                      -- RX-0123
  customer_id uuid NOT NULL REFERENCES users(id),
  kind delivery_kind NOT NULL,
  status delivery_status NOT NULL DEFAULT 'draft',
  scheduled_for timestamptz,
  recurrence_id uuid REFERENCES recurring_plans(id),
  quote jsonb NOT NULL,
  quote_hash text NOT NULL,
  config_version int NOT NULL REFERENCES config_versions(id),
  rider_id uuid,  -- FK added in 004 (rider_profiles) via late_rider_fk
  package jsonb NOT NULL,
  cancel_reason text, cancelled_at timestamptz, cancelled_by uuid,
  safety_flags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deliveries_status_idx ON deliveries (status) WHERE status NOT IN ('delivered','cancelled');
CREATE INDEX IF NOT EXISTS deliveries_customer_idx ON deliveries (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS deliveries_rider_idx ON deliveries (rider_id, created_at DESC);

CREATE TABLE IF NOT EXISTS delivery_stops (
  id bigserial PRIMARY KEY,
  delivery_id uuid NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  seq int NOT NULL,
  kind stop_kind NOT NULL,
  label text NOT NULL,
  landmark_id text REFERENCES landmarks(id),
  point geometry(Point,4326) NOT NULL,
  zone_id text NOT NULL REFERENCES zones(id),
  receiver jsonb,
  UNIQUE (delivery_id, seq)
);

CREATE TABLE IF NOT EXISTS delivery_events (     -- append-only status history
  id bigserial PRIMARY KEY,
  delivery_id uuid NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  from_status delivery_status,
  to_status delivery_status NOT NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('system','customer','rider','admin')),
  actor_id uuid,
  note text,
  at timestamptz NOT NULL DEFAULT now()
);
REVOKE UPDATE, DELETE ON delivery_events FROM app_rw;

CREATE TABLE IF NOT EXISTS delivery_codes (
  delivery_id uuid PRIMARY KEY REFERENCES deliveries(id) ON DELETE CASCADE,
  pickup_code_hash text NOT NULL,
  delivery_code_hash text NOT NULL,
  pickup_attempts int NOT NULL DEFAULT 0,
  delivery_attempts int NOT NULL DEFAULT 0,
  pickup_locked_until timestamptz,
  delivery_locked_until timestamptz,
  pickup_verified_at timestamptz,
  delivery_verified_at timestamptz
);

CREATE TABLE IF NOT EXISTS verification_attempts (  -- every attempt, audited (C-4)
  id bigserial PRIMARY KEY,
  delivery_id uuid NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  code_kind text NOT NULL CHECK (code_kind IN ('pickup','delivery')),
  ok bool NOT NULL,
  by_user uuid,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS verification_attempts_idx ON verification_attempts (delivery_id, code_kind, at);

CREATE TABLE IF NOT EXISTS tracking_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,               -- token itself only in the URL
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  rotated_from uuid REFERENCES tracking_tokens(id)
);
CREATE INDEX IF NOT EXISTS tracking_tokens_delivery_idx ON tracking_tokens (delivery_id);

COMMIT;
