-- =====================================================================
-- ROOT-X migration 001 — core: enums, zones, identity, audit.
-- Forward-only, idempotent. Apply with:
--   psql "$DATABASE_URL" -f database/migrations/001_init_core.sql
-- =====================================================================
BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---- enums -----------------------------------------------------------
DO $$ BEGIN
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
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---- geography (before users: users.zone_id FK) ------------------------
CREATE TABLE IF NOT EXISTS zones (
  id text PRIMARY KEY,
  campus_id text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('campus','township')),
  geom geometry(Polygon,4326) NOT NULL,
  active bool NOT NULL DEFAULT true,
  inter_zone_policy text NOT NULL DEFAULT 'intra_zone_only'
    CHECK (inter_zone_policy IN ('intra_zone_only','same_campus')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS landmarks (
  id text PRIMARY KEY,
  zone_id text NOT NULL REFERENCES zones(id),
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('gate','academic','hostel','commercial','health','transport')),
  point geometry(Point,4326) NOT NULL
);

-- ---- identity --------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
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

CREATE TABLE IF NOT EXISTS otp_challenges (
  id bigserial PRIMARY KEY,
  phone_citext citext NOT NULL,
  code_hash text NOT NULL,                       -- never plain
  attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  expires_at timestamptz NOT NULL,
  pending_user_id uuid REFERENCES users(id),
  registering jsonb
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  refresh_hash text NOT NULL,
  mfa_required bool NOT NULL DEFAULT false,
  device text, created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- ---- audit (append-only, C-7) ------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id bigserial PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  reason text,
  before jsonb,
  after jsonb
);
REVOKE UPDATE, DELETE ON audit_log FROM app_rw;
CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON audit_log (actor_id, at DESC);
CREATE INDEX IF NOT EXISTS audit_log_target_idx ON audit_log (target_type, target_id, at DESC);

-- ---- config versions (pricing/commission without code changes) ---------
CREATE TABLE IF NOT EXISTS config_versions (
  id int PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  pricing jsonb NOT NULL,
  hours jsonb NOT NULL,
  policies jsonb NOT NULL,
  note text NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- zone membership helper: server-side only (C-2) ---------------------
CREATE OR REPLACE FUNCTION point_zone(point geometry(Point,4326))
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT id FROM zones WHERE active AND ST_Contains(geom, point) LIMIT 1
$$;

COMMIT;
