BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'cancelled')),
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_date_order CHECK (start_date < end_date),
  CONSTRAINT subscriptions_id_user_unique UNIQUE (id, user_id),
  CONSTRAINT subscriptions_active_periods_no_overlap
    EXCLUDE USING gist (
      user_id WITH =,
      daterange(start_date, end_date, '[)') WITH &&
    )
    WHERE (status = 'active')
);

CREATE INDEX subscriptions_user_start_date_idx
  ON subscriptions (user_id, start_date DESC);

COMMENT ON COLUMN subscriptions.end_date IS
  'Exclusive end date; a 30-day term ends at start_date + 30 days.';
COMMENT ON CONSTRAINT subscriptions_active_periods_no_overlap
  ON subscriptions IS
  'Prevents overlapping active subscription periods for the same user.';

COMMIT;
