-- =====================================================================
-- ROOT-X — PostgreSQL 15+ / PostGIS schema (authoritative DDL)
-- Money is stored in kobo (integer). Enum sets mirror src/engine/types.ts.
-- This consolidated view matches database/migrations/ (which apply in
-- dependency order). Run migrations, not this file, on a live database.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---- enums -----------------------------------------------------------
CREATE TYPE user_role AS ENUM ('customer','rider','admin','finance','security');
CREATE TYPE user_status AS ENUM ('active','suspended','banned');
CREATE TYPE application_status AS ENUM ('draft','submitted','approved','rejected');
CREATE TYPE transport_type AS ENUM ('foot','bicycle','motorcycle');
CREATE TYPE delivery_kind AS ENUM ('immediate','scheduled','recurring');
CREATE TYPE delivery_status AS ENUM (
  'draft','awaiting_payment','payment_processing','awaiting_rider',
  'offered_to_riders','rider_assigned','rider_approaching_pickup','at_pickup',
  'pickup_verification_pending','package_collected','in_transit',
  'approaching_destination','delivery_verification_pending','delivered',
  'cancellation_requested','cancelled','return_required','disputed','under_review');
CREATE TYPE payment_method AS ENUM ('card','transfer','wallet');
CREATE TYPE payment_status AS ENUM ('initiated','processing','succeeded','failed');
CREATE TYPE ledger_settlement AS ENUM ('pending','ready','settled');
CREATE TYPE batch_status AS ENUM ('awaiting_approval','approved','rejected');
CREATE TYPE stop_kind AS ENUM ('pickup','dropoff');
CREATE TYPE incident_kind AS ENUM ('sos','harassment','accident','unsafe_area','other');

-- ---- geography (C-2) -------------------------------------------------
CREATE TABLE zones (
  id text PRIMARY KEY,                           -- e.g. 'osogbo-campus'
  campus_id text NOT NULL,                       -- multi-campus grouping
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('campus','township')),
  geom geometry(Polygon,4326) NOT NULL,
  active bool NOT NULL DEFAULT true,
  inter_zone_policy text NOT NULL DEFAULT 'intra_zone_only'
    CHECK (inter_zone_policy IN ('intra_zone_only','same_campus')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE landmarks (
  id text PRIMARY KEY,
  zone_id text NOT NULL REFERENCES zones(id),
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('gate','academic','hostel','commercial','health','transport')),
  point geometry(Point,4326) NOT NULL
);

-- ---- identity --------------------------------------------------------
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_citext citext UNIQUE NOT NULL,          -- no duplicate accounts (C-1)
  name text NOT NULL,
  role user_role NOT NULL DEFAULT 'customer',
  zone_id text NOT NULL REFERENCES zones(id),
  wallet_balance_kobo bigint NOT NULL DEFAULT 0 CHECK (wallet_balance_kobo >= 0),
  status user_status NOT NULL DEFAULT 'active',
  notify_prefs jsonb NOT NULL DEFAULT '{"push":true,"sms":true,"email":false}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE otp_challenges (
  id bigserial PRIMARY KEY,
  phone_citext citext NOT NULL,
  code_hash text NOT NULL,                       -- never plain
  attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  expires_at timestamptz NOT NULL,
  pending_user_id uuid REFERENCES users(id),
  registering jsonb
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  refresh_hash text NOT NULL,
  mfa_required bool NOT NULL DEFAULT false,
  device text, created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- ---- rider verification (C-1) ----------------------------------------
CREATE TABLE rider_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  full_name text NOT NULL,
  matric_number_norm text NOT NULL UNIQUE,       -- normalized; one identity
  student_id_doc_ref text NOT NULL,              -- private object-store ref
  phone_citext citext NOT NULL,
  emergency_contact jsonb NOT NULL,              -- {name,phone,relationship}
  transport transport_type NOT NULL,
  zone_id text NOT NULL REFERENCES zones(id),
  status application_status NOT NULL DEFAULT 'draft',
  terms_accepted_at timestamptz NOT NULL,
  submitted_at timestamptz,
  -- no second application while under review
  CONSTRAINT one_active_application UNIQUE (user_id)
    DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX one_active_app_idx ON rider_applications (user_id)
  WHERE status IN ('draft','submitted');

CREATE TABLE application_review_notes (
  id bigserial PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES rider_applications(id),
  by_admin uuid NOT NULL REFERENCES users(id),
  note text NOT NULL,                            -- required
  decision application_status,
  at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rider_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id),
  application_id uuid NOT NULL UNIQUE REFERENCES rider_applications(id),
  transport transport_type NOT NULL,
  capacity_kg int NOT NULL CHECK (capacity_kg BETWEEN 1 AND 30),
  capacity_liters int NOT NULL CHECK (capacity_liters BETWEEN 1 AND 90),
  zone_id text NOT NULL REFERENCES zones(id),
  is_available bool NOT NULL DEFAULT false,
  rating_sum int NOT NULL DEFAULT 0,
  rating_count int NOT NULL DEFAULT 0,
  completed int NOT NULL DEFAULT 0,
  on_time int NOT NULL DEFAULT 0,
  pending_earnings_kobo bigint NOT NULL DEFAULT 0,
  available_earnings_kobo bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
  -- created ONLY by application approval (service rule + trigger)
);

CREATE TABLE rider_availability_days (
  rider_id uuid REFERENCES rider_profiles(id),
  dow int NOT NULL CHECK (dow BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  PRIMARY KEY (rider_id, dow, start_time)
);

-- ---- deliveries (C-4, C-8) -------------------------------------------
CREATE TABLE deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE,                      -- RX-0123
  customer_id uuid NOT NULL REFERENCES users(id),
  kind delivery_kind NOT NULL,
  status delivery_status NOT NULL DEFAULT 'draft',
  scheduled_for timestamptz,
  recurrence_id uuid REFERENCES recurring_plans(id),
  quote jsonb NOT NULL,                          -- full line items
  quote_hash text NOT NULL,                      -- tamper evidence
  config_version int NOT NULL REFERENCES config_versions(id),
  rider_id uuid REFERENCES rider_profiles(id),  -- see migrations/004 late FK
  package jsonb NOT NULL,                        -- description, category, weight,
                                                -- dims, photos[], contents_declared,
                                                -- handling_notes, fragile, food,
                                                -- declared_value
  cancel_reason text, cancelled_at timestamptz, cancelled_by uuid,
  safety_flags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX deliveries_status_idx ON deliveries (status) WHERE status NOT IN ('delivered','cancelled');
CREATE INDEX deliveries_customer_idx ON deliveries (customer_id, created_at DESC);
CREATE INDEX deliveries_rider_idx ON deliveries (rider_id, created_at DESC);

CREATE TABLE delivery_stops (
  id bigserial PRIMARY KEY,
  delivery_id uuid NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  seq int NOT NULL,
  kind stop_kind NOT NULL,
  label text NOT NULL,
  landmark_id text REFERENCES landmarks(id),
  point geometry(Point,4326) NOT NULL,
  zone_id text NOT NULL REFERENCES zones(id),
  receiver jsonb,                                -- {name,phone} for dropoffs
  UNIQUE (delivery_id, seq)
);

CREATE TABLE delivery_events (                   -- append-only status history
  id bigserial PRIMARY KEY,
  delivery_id uuid NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  from_status delivery_status,
  to_status delivery_status NOT NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('system','customer','rider','admin')),
  actor_id uuid,
  note text,
  at timestamptz NOT NULL DEFAULT now()
);
REVOKE UPDATE, DELETE ON delivery_events FROM app_rw;  -- append-only

CREATE TABLE delivery_codes (
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

CREATE TABLE verification_attempts (              -- every attempt, for audit (C-4)
  id bigserial PRIMARY KEY,
  delivery_id uuid NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  code_kind text NOT NULL CHECK (code_kind IN ('pickup','delivery')),
  ok bool NOT NULL,
  by_user uuid,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX verification_attempts_idx ON verification_attempts (delivery_id, code_kind, at);

CREATE TABLE tracking_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,               -- token itself only in the URL
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  rotated_from uuid REFERENCES tracking_tokens(id)
);
CREATE INDEX tracking_tokens_delivery_idx ON tracking_tokens (delivery_id);

-- ---- payments & ledger (C-5, C-8) ------------------------------------
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES deliveries(id),
  method payment_method NOT NULL,
  amount_kobo bigint NOT NULL CHECK (amount_kobo > 0),
  status payment_status NOT NULL DEFAULT 'initiated',
  gateway_ref text,
  idempotency_key text NOT NULL UNIQUE,          -- webhook replays are safe
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payment_events (                    -- append-only
  id bigserial PRIMARY KEY,
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  status payment_status NOT NULL,
  note text,
  at timestamptz NOT NULL DEFAULT now()
);
REVOKE UPDATE, DELETE ON payment_events FROM app_rw;

CREATE TABLE ledger_records (
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

CREATE TABLE settlement_batches (
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

CREATE TABLE payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL REFERENCES rider_profiles(id),
  amount_kobo bigint NOT NULL CHECK (amount_kobo > 0),
  batch_id uuid REFERENCES settlement_batches(id),
  provider_ref text,
  status payment_status NOT NULL DEFAULT 'initiated',
  requested_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

-- ---- oversight (C-6, C-7) ---------------------------------------------
CREATE TABLE disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES deliveries(id),
  opened_by uuid NOT NULL REFERENCES users(id),
  reason text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','escalated')),
  opened_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dispute_events (
  id bigserial PRIMARY KEY,
  dispute_id uuid NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  by_admin uuid NOT NULL REFERENCES users(id),
  outcome text NOT NULL,
  refund_amount_kobo bigint NOT NULL DEFAULT 0,
  from_rider_share bool NOT NULL DEFAULT true,
  note text NOT NULL,                            -- required
  at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL REFERENCES rider_profiles(id),
  delivery_id uuid REFERENCES deliveries(id),
  kind incident_kind NOT NULL,
  note text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  opened_at timestamptz NOT NULL DEFAULT now()
  -- deliberately no penalty columns: penalties are separate human decisions
);

CREATE TABLE incident_events (
  id bigserial PRIMARY KEY,
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  by_user uuid NOT NULL REFERENCES users(id),
  note text NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (                         -- append-only (C-7)
  id bigserial PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid NOT NULL,
  action text NOT NULL,                          -- e.g. 'rider.approve', 'pricing.update'
  target_type text NOT NULL,
  target_id text NOT NULL,
  reason text,
  before jsonb,
  after jsonb
);
REVOKE UPDATE, DELETE ON audit_log FROM app_rw;
CREATE INDEX audit_log_actor_idx ON audit_log (actor_id, at DESC);
CREATE INDEX audit_log_target_idx ON audit_log (target_type, target_id, at DESC);

-- ---- config (pricing without code changes) ----------------------------
CREATE TABLE config_versions (
  id int PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  pricing jsonb NOT NULL,
  hours jsonb NOT NULL,
  policies jsonb NOT NULL,
  note text NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE recurring_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES users(id),
  template jsonb NOT NULL,                       -- stops, package, transport
  days int[] NOT NULL CHECK (array_length(days,1) BETWEEN 1 AND 7),
  time time NOT NULL,
  active bool NOT NULL DEFAULT true,
  next_occurrence timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE recurring_occurrences (
  plan_id uuid REFERENCES recurring_plans(id) ON DELETE CASCADE,
  planned_for timestamptz NOT NULL,
  delivery_id uuid REFERENCES deliveries(id),
  skipped bool NOT NULL DEFAULT false,
  PRIMARY KEY (plan_id, planned_for)
);

-- ---- notifications -----------------------------------------------------
CREATE TABLE notifications (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  category text NOT NULL CHECK (category IN ('delivery','payment','safety','system')),
  title text NOT NULL,
  body text NOT NULL,
  delivery_id uuid REFERENCES deliveries(id),
  read_at timestamptz,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON notifications (user_id, at DESC) WHERE read_at IS NULL;

-- ---- rider location (hot path; downsampled) ----------------------------
CREATE TABLE rider_locations (
  rider_id uuid NOT NULL REFERENCES rider_profiles(id),
  at timestamptz NOT NULL,
  point geometry(Point,4326) NOT NULL,
  PRIMARY KEY (rider_id, at)
);

-- ---- helper: zone membership is server-side only ------------------------
CREATE FUNCTION point_zone(point geometry(Point,4326))
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT id FROM zones WHERE active AND ST_Contains(geom, point) LIMIT 1
$$;
