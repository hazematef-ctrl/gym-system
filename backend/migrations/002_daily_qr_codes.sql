BEGIN;

CREATE TABLE daily_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  subscription_id UUID NOT NULL,
  qr_token_hash BYTEA NOT NULL UNIQUE
    CHECK (octet_length(qr_token_hash) = 32),
  qr_token_ciphertext BYTEA NOT NULL,
  qr_token_iv BYTEA NOT NULL CHECK (octet_length(qr_token_iv) = 12),
  qr_token_auth_tag BYTEA NOT NULL
    CHECK (octet_length(qr_token_auth_tag) = 16),
  key_version SMALLINT NOT NULL CHECK (key_version > 0),
  qr_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scanned_at TIMESTAMPTZ,
  scanned_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT daily_qr_codes_user_date_unique UNIQUE (user_id, qr_date),
  CONSTRAINT daily_qr_codes_subscription_user_fk
    FOREIGN KEY (subscription_id, user_id)
    REFERENCES subscriptions(id, user_id)
    ON DELETE RESTRICT,
  CONSTRAINT daily_qr_codes_scan_fields_check
    CHECK ((scanned_at IS NULL) = (scanned_by IS NULL))
);

CREATE INDEX daily_qr_codes_subscription_idx
  ON daily_qr_codes (subscription_id);

COMMENT ON TABLE daily_qr_codes IS
  'One daily access credential per member; raw tokens are never stored.';

COMMIT;
