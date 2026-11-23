import pool from "../config/db.js";
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

export type QrScanRow = {
  id: string;
  userId: string;
  subscriptionId: string;
  qrDate: string;
  scannedAt: Date | null;
  scannedBy: string | null;
  memberName: string;
  memberPhone: string;
  profilePhotoStorageKey: string | null;
};

export type TodayQrAttendanceRow = {
  businessDate: string;
  qrGenerated: boolean;
  scanTimestamp: Date | null;
  scanAdminRecorded: boolean;
  scannedByName: string | null;
  attendanceRegistered: boolean;
  attendanceMatchesQr: boolean;
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
  findTodayAttendanceStatus: async (
    userId: string,
    timeZone: string,
  ): Promise<TodayQrAttendanceRow> => {
    const result = await pool.query<TodayQrAttendanceRow>(
      `WITH business_day AS (
        SELECT (now() AT TIME ZONE $2)::date AS attendance_date
      )
      SELECT
        to_char(business_day.attendance_date, 'YYYY-MM-DD') AS "businessDate",
        qr.id IS NOT NULL AS "qrGenerated",
        qr.scanned_at AS "scanTimestamp",
        qr.scanned_by IS NOT NULL AS "scanAdminRecorded",
        scanning_admin.name AS "scannedByName",
        attendance.id IS NOT NULL AS "attendanceRegistered",
        CASE
          WHEN qr.id IS NULL OR attendance.id IS NULL THEN false
          ELSE attendance.qr_code_id = qr.id
        END AS "attendanceMatchesQr"
      FROM business_day
      LEFT JOIN daily_qr_codes qr
        ON qr.user_id = $1
       AND qr.qr_date = business_day.attendance_date
      LEFT JOIN attendance
        ON attendance.user_id = $1
       AND attendance.attendance_date = business_day.attendance_date
      LEFT JOIN users scanning_admin ON scanning_admin.id = qr.scanned_by`,
      [userId, timeZone],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("Could not determine today's QR attendance status");
    }

    return row;
  },

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

  findForScanByTokenHash: async (client: PoolClient, tokenHash: Buffer) => {
    const result = await client.query<QrScanRow>(
      `SELECT
        qr.id,
        qr.user_id AS "userId",
        qr.subscription_id AS "subscriptionId",
        to_char(qr.qr_date, 'YYYY-MM-DD') AS "qrDate",
        qr.scanned_at AS "scannedAt",
        qr.scanned_by AS "scannedBy",
        u.name AS "memberName",
        u.phone_number AS "memberPhone",
        u.profile_photo_storage_key AS "profilePhotoStorageKey"
       FROM daily_qr_codes qr
       JOIN users u ON u.id = qr.user_id
       WHERE qr.qr_token_hash = $1
       FOR UPDATE OF qr`,
      [tokenHash],
    );

    return result.rows[0] ?? null;
  },

  consumeForScan: async (
    client: PoolClient,
    qrId: string,
    adminId: string,
    businessDate: string,
  ) => {
    const result = await client.query<{ scannedAt: Date }>(
      `UPDATE daily_qr_codes
       SET scanned_at = now(), scanned_by = $2
       WHERE id = $1
         AND scanned_at IS NULL
         AND qr_date = $3::date
       RETURNING scanned_at AS "scannedAt"`,
      [qrId, adminId, businessDate],
    );

    return result.rows[0] ?? null;
  },
};
