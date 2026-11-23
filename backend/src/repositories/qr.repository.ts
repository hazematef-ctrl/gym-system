import type { PoolClient } from "pg";
import type { EncryptedQrToken } from "../config/qr-crypto.js";

export type DailyQrRow = {
  id: string;
  userId: string;
  subscriptionId: string;
  tokenHash: Buffer;
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
  keyVersion: number;
  qrDate: string;
  scannedAt: Date | null;
};

const qrColumns = `
  id,
  user_id AS "userId",
  subscription_id AS "subscriptionId",
  qr_token_hash AS "tokenHash",
  qr_token_ciphertext AS ciphertext,
  qr_token_iv AS iv,
  qr_token_auth_tag AS "authTag",
  key_version AS "keyVersion",
  to_char(qr_date, 'YYYY-MM-DD') AS "qrDate",
  scanned_at AS "scannedAt"
`;

export const qrRepository = {
  getBusinessDate: async (client: PoolClient, timeZone: string) => {
    const result = await client.query<{ qrDate: string }>(
      `SELECT to_char((now() AT TIME ZONE $1)::date, 'YYYY-MM-DD') AS "qrDate"`,
      [timeZone],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("Could not determine the current QR business date");
    }

    return row.qrDate;
  },

  findForUserDate: async (
    client: PoolClient,
    userId: string,
    qrDate: string,
  ) => {
    const result = await client.query<DailyQrRow>(
      `SELECT ${qrColumns}
       FROM daily_qr_codes
       WHERE user_id = $1 AND qr_date = $2::date
       FOR UPDATE`,
      [userId, qrDate],
    );

    return result.rows[0] ?? null;
  },

  insertIfAbsent: async (
    client: PoolClient,
    input: {
      userId: string;
      subscriptionId: string;
      qrDate: string;
      tokenHash: Buffer;
      encrypted: EncryptedQrToken;
    },
  ) => {
    const result = await client.query<DailyQrRow>(
      `INSERT INTO daily_qr_codes (
        user_id,
        subscription_id,
        qr_token_hash,
        qr_token_ciphertext,
        qr_token_iv,
        qr_token_auth_tag,
        key_version,
        qr_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date)
      ON CONFLICT (user_id, qr_date) DO NOTHING
      RETURNING ${qrColumns}`,
      [
        input.userId,
        input.subscriptionId,
        input.tokenHash,
        input.encrypted.ciphertext,
        input.encrypted.iv,
        input.encrypted.authTag,
        input.encrypted.keyVersion,
        input.qrDate,
      ],
    );

    return result.rows[0] ?? null;
  },
};
