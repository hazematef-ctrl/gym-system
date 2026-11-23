import pool from "../config/db.js";
import type { PoolClient } from "pg";

export type CurrentSubscriptionRow = {
  status: "active" | "expired" | "cancelled";
  startDate: string;
  endDate: string;
  remainingDays: number;
  durationDays: number;
  price: string;
};

export type SubscriptionHistoryRow = {
  id: string;
  status: "active" | "upcoming" | "expired" | "cancelled";
  startDate: string;
  endDate: string;
  remainingDays: number;
  durationDays: number;
  price: string;
  createdAt: Date;
};

export type InsertedSubscription = {
  id: string;
  status: "active";
  startDate: string;
  endDate: string;
  price: string;
};

export type ActiveSubscriptionRow = {
  id: string;
};

const subscriptionStatus = `CASE
  WHEN s.status = 'cancelled' THEN 'cancelled'
  WHEN s.status = 'active'
    AND s.start_date <= business_day.business_date
    AND s.end_date > business_day.business_date
    THEN 'active'
  WHEN s.status = 'active'
    AND s.start_date > business_day.business_date
    THEN 'upcoming'
  ELSE 'expired'
END`;

const subscriptionRemainingDays = `CASE
  WHEN s.status = 'active'
    AND s.start_date <= business_day.business_date
    AND s.end_date > business_day.business_date
    THEN (s.end_date - business_day.business_date)::int
  ELSE 0
END`;

const subscriptionDetails = `
  ${subscriptionStatus} AS status,
  to_char(s.start_date, 'YYYY-MM-DD') AS "startDate",
  to_char(s.end_date, 'YYYY-MM-DD') AS "endDate",
  ${subscriptionRemainingDays} AS "remainingDays",
  (s.end_date - s.start_date)::int AS "durationDays",
  s.price::text AS price
`;

export const subscriptionRepository = {
  findCurrentForUser: async (userId: string, timeZone: string) => {
    const result = await pool.query<CurrentSubscriptionRow>(
      `WITH business_day AS (
        SELECT (now() AT TIME ZONE $2)::date AS business_date
      )
      SELECT
        ${subscriptionDetails}
      FROM subscriptions s
      CROSS JOIN business_day
      WHERE s.user_id = $1
        AND s.start_date <= business_day.business_date
      ORDER BY s.start_date DESC, s.created_at DESC
      LIMIT 1`,
      [userId, timeZone],
    );

    return result.rows[0] ?? null;
  },

  findHistoryForUser: async (
    userId: string,
    timeZone: string,
  ): Promise<SubscriptionHistoryRow[]> => {
    const result = await pool.query<SubscriptionHistoryRow>(
      `WITH business_day AS (
        SELECT (now() AT TIME ZONE $2)::date AS business_date
      )
      SELECT
        s.id,
        ${subscriptionDetails},
        s.created_at AS "createdAt"
      FROM subscriptions s
      CROSS JOIN business_day
      WHERE s.user_id = $1
      ORDER BY s.start_date DESC, s.created_at DESC`,
      [userId, timeZone],
    );

    return result.rows;
  },

  findActiveForUser: async (
    client: PoolClient,
    userId: string,
    timeZone: string,
  ) => {
    const result = await client.query<ActiveSubscriptionRow>(
      `SELECT id
       FROM subscriptions
       WHERE user_id = $1
         AND status = 'active'
         AND start_date <= (now() AT TIME ZONE $2)::date
         AND end_date > (now() AT TIME ZONE $2)::date
       ORDER BY start_date DESC
       LIMIT 1
       FOR SHARE`,
      [userId, timeZone],
    );

    return result.rows[0] ?? null;
  },

  expireEndedForUser: async (
    client: PoolClient,
    userId: string,
    timeZone: string,
  ) => {
    await client.query(
      `UPDATE subscriptions
       SET status = 'expired'
       WHERE user_id = $1
         AND status = 'active'
         AND end_date <= (now() AT TIME ZONE $2)::date`,
      [userId, timeZone],
    );
  },

  createForUser: async (
    client: PoolClient,
    userId: string,
    subscriptionDays: number,
    price: number,
    timeZone: string,
  ) => {
    const result = await client.query<InsertedSubscription>(
      `WITH business_day AS (
        SELECT (now() AT TIME ZONE $4)::date AS business_date
      ),
      next_start AS (
        SELECT GREATEST(
          business_day.business_date,
          COALESCE(MAX(existing.end_date), business_day.business_date)
        ) AS start_date
        FROM business_day
        LEFT JOIN subscriptions existing
          ON existing.user_id = $1
         AND existing.status = 'active'
         AND existing.end_date > business_day.business_date
        GROUP BY business_day.business_date
      )
      INSERT INTO subscriptions (
        user_id,
        start_date,
        end_date,
        status,
        price
      )
      SELECT $1, next_start.start_date,
        next_start.start_date + $2::int, 'active', $3::numeric
      FROM next_start
      RETURNING
        id,
        status,
        to_char(start_date, 'YYYY-MM-DD') AS "startDate",
        to_char(end_date, 'YYYY-MM-DD') AS "endDate",
        price::text AS price`,
      [userId, subscriptionDays, price, timeZone],
    );

    return result.rows[0];
  },
};
