-- =====================================================================
-- ROOT-X migration 005 — oversight: disputes, incidents, notifications,
-- late-arriving FKs. Requires 001–004.
-- =====================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES deliveries(id),
  opened_by uuid NOT NULL REFERENCES users(id),
  reason text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','escalated')),
  opened_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dispute_events (
  id bigserial PRIMARY KEY,
  dispute_id uuid NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  by_admin uuid NOT NULL REFERENCES users(id),
  outcome text NOT NULL,
  refund_amount_kobo bigint NOT NULL DEFAULT 0,
  from_rider_share bool NOT NULL DEFAULT true,
  note text NOT NULL,                            -- required
  at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL REFERENCES rider_profiles(id),
  delivery_id uuid REFERENCES deliveries(id),
  kind incident_kind NOT NULL,
  note text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  opened_at timestamptz NOT NULL DEFAULT now()
  -- deliberately no penalty columns: penalties are separate human decisions (C-6)
);

CREATE TABLE IF NOT EXISTS incident_events (
  id bigserial PRIMARY KEY,
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  by_user uuid NOT NULL REFERENCES users(id),
  note text NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  category text NOT NULL CHECK (category IN ('delivery','payment','safety','system')),
  title text NOT NULL,
  body text NOT NULL,
  delivery_id uuid REFERENCES deliveries(id),
  read_at timestamptz,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, at DESC) WHERE read_at IS NULL;

COMMIT;
