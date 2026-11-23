import pool from "../config/db.js";
import type { PoolClient } from "pg";

export type AttendanceRow = {
  id: string;
  userId: string;
  subscriptionId: string;
  qrCodeId: string;
  attendanceDate: string;
  subscriptionEndDate: string;
  createdAt: Date;
};

export type ActiveScanSubscription = {
  endDate: string;
};

export type MemberAttendanceHistoryRow = {
  attendanceDate: string;
  scanTimestamp: Date | null;
  scannedByName: string | null;
};

export const attendanceRepository = {
  findHistoryForUser: async (
    userId: string,
    limit: number,
  ): Promise<MemberAttendanceHistoryRow[]> => {
    const result = await pool.query<MemberAttendanceHistoryRow>(
      `SELECT
        to_char(a.attendance_date, 'YYYY-MM-DD') AS "attendanceDate",
        qr.scanned_at AS "scanTimestamp",
        admin.name AS "scannedByName"
       FROM attendance a
       JOIN daily_qr_codes qr ON qr.id = a.qr_code_id
       LEFT JOIN users admin ON admin.id = qr.scanned_by
       WHERE a.user_id = $1
       ORDER BY a.attendance_date DESC, a.created_at DESC
       LIMIT $2`,
      [userId, limit],
    );

    return result.rows;
  },

  findByQrCode: async (client: PoolClient, qrCodeId: string) => {
    const result = await client.query<AttendanceRow>(
      `SELECT
        a.id,
        a.user_id AS "userId",
        a.subscription_id AS "subscriptionId",
        a.qr_code_id AS "qrCodeId",
        to_char(a.attendance_date, 'YYYY-MM-DD') AS "attendanceDate",
        a.created_at AS "createdAt",
        to_char(s.end_date, 'YYYY-MM-DD') AS "subscriptionEndDate"
       FROM attendance a
       JOIN subscriptions s
         ON s.id = a.subscription_id AND s.user_id = a.user_id
       WHERE a.qr_code_id = $1`,
      [qrCodeId],
    );

    return result.rows[0] ?? null;
  },

  findActiveSubscriptionForScan: async (
    client: PoolClient,
    userId: string,
    subscriptionId: string,
    businessDate: string,
  ) => {
    const result = await client.query<ActiveScanSubscription>(
      `SELECT to_char(end_date, 'YYYY-MM-DD') AS "endDate"
       FROM subscriptions
       WHERE id = $1
         AND user_id = $2
         AND status = 'active'
         AND start_date <= $3::date
         AND end_date > $3::date
       FOR SHARE`,
      [subscriptionId, userId, businessDate],
    );

    return result.rows[0] ?? null;
  },

  insert: async (
    client: PoolClient,
    input: {
      userId: string;
      subscriptionId: string;
      qrCodeId: string;
      attendanceDate: string;
      subscriptionEndDate: string;
    },
  ) => {
    const result = await client.query<AttendanceRow>(
      `INSERT INTO attendance (
        user_id,
        subscription_id,
        qr_code_id,
        attendance_date
      )
      VALUES ($1, $2, $3, $4::date)
      RETURNING
        id,
        user_id AS "userId",
        subscription_id AS "subscriptionId",
        qr_code_id AS "qrCodeId",
        to_char(attendance_date, 'YYYY-MM-DD') AS "attendanceDate",
        created_at AS "createdAt",
        $5::date AS "subscriptionEndDate"`,
      [
        input.userId,
        input.subscriptionId,
        input.qrCodeId,
        input.attendanceDate,
        input.subscriptionEndDate,
      ],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("Attendance insert did not return a row");
    }

    return row;
  },
};
