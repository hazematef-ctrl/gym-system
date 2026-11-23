BEGIN;

ALTER TABLE users
  ADD COLUMN profile_photo_storage_key TEXT;

ALTER TABLE daily_qr_codes
  ADD CONSTRAINT daily_qr_codes_attendance_identity_unique
  UNIQUE (id, user_id, subscription_id, qr_date);

CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  subscription_id UUID NOT NULL,
  qr_code_id UUID NOT NULL,
  attendance_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT attendance_user_date_unique
    UNIQUE (user_id, attendance_date),
  CONSTRAINT attendance_qr_code_unique
    UNIQUE (qr_code_id),
  CONSTRAINT attendance_subscription_user_fk
    FOREIGN KEY (subscription_id, user_id)
    REFERENCES subscriptions(id, user_id)
    ON DELETE RESTRICT,
  CONSTRAINT attendance_qr_identity_fk
    FOREIGN KEY (qr_code_id, user_id, subscription_id, attendance_date)
    REFERENCES daily_qr_codes(id, user_id, subscription_id, qr_date)
    ON DELETE RESTRICT
);

CREATE INDEX attendance_date_created_at_idx
  ON attendance (attendance_date DESC, created_at DESC);

CREATE TABLE profile_photo_cleanup_queue (
  storage_key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX profile_photo_cleanup_due_idx
  ON profile_photo_cleanup_queue (next_attempt_at, created_at);

COMMIT;
