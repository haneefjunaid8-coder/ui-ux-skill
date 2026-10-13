-- =====================================================================
-- ROOT-X migration 004 — rider verification pipeline (C-1).
-- Requires 001 (users, zones), 002 (deliveries for FK types).
-- =====================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS rider_applications (
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
  submitted_at timestamptz
);
-- only one application per user may be in the review pipeline
CREATE UNIQUE INDEX IF NOT EXISTS one_active_app_idx ON rider_applications (user_id)
  WHERE status IN ('draft','submitted');

CREATE TABLE IF NOT EXISTS application_review_notes (
  id bigserial PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES rider_applications(id),
  by_admin uuid NOT NULL REFERENCES users(id),
  note text NOT NULL,                            -- required
  decision application_status,
  at timestamptz NOT NULL DEFAULT now()
);

-- rider_profiles is created ONLY by application approval (service rule).
CREATE TABLE IF NOT EXISTS rider_profiles (
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
);

CREATE TABLE IF NOT EXISTS rider_availability_days (
  rider_id uuid REFERENCES rider_profiles(id),
  dow int NOT NULL CHECK (dow BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  PRIMARY KEY (rider_id, dow, start_time)
);

-- rider location hot table (writes only during active runs, C-4)
CREATE TABLE IF NOT EXISTS rider_locations (
  rider_id uuid NOT NULL REFERENCES rider_profiles(id),
  at timestamptz NOT NULL,
  point geometry(Point,4326) NOT NULL,
  PRIMARY KEY (rider_id, at)
);

-- late FKs: deliveries.rider_id, payouts.rider_id (tables pre-date riders)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'late_rider_fk') THEN
    ALTER TABLE deliveries ADD CONSTRAINT late_rider_fk
      FOREIGN KEY (rider_id) REFERENCES rider_profiles(id);
    ALTER TABLE payouts ADD CONSTRAINT late_payout_rider_fk
      FOREIGN KEY (rider_id) REFERENCES rider_profiles(id);
  END IF;
END $$;

COMMIT;
