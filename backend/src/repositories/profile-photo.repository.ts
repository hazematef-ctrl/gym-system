import pool from "../config/db.js";
import type { PoolClient } from "pg";

export const profilePhotoRepository = {
  enqueueCleanup: async (client: PoolClient, storageKey: string) => {
    await client.query(
      `INSERT INTO profile_photo_cleanup_queue (storage_key)
       VALUES ($1)
       ON CONFLICT (storage_key) DO NOTHING`,
      [storageKey],
    );
  },

  enqueueCleanupStandalone: async (storageKey: string) => {
    await pool.query(
      `INSERT INTO profile_photo_cleanup_queue (storage_key)
       VALUES ($1)
       ON CONFLICT (storage_key) DO NOTHING`,
      [storageKey],
    );
  },

  isReferenced: async (storageKey: string) => {
    const result = await pool.query<{ isReferenced: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM users WHERE profile_photo_storage_key = $1
       ) AS "isReferenced"`,
      [storageKey],
    );

    return result.rows[0]?.isReferenced === true;
  },

  listDueCleanupKeys: async (limit: number) => {
    const result = await pool.query<{ storageKey: string }>(
      `SELECT storage_key AS "storageKey"
       FROM profile_photo_cleanup_queue
       WHERE next_attempt_at <= now()
       ORDER BY next_attempt_at, created_at
       LIMIT $1`,
      [limit],
    );

    return result.rows.map((row) => row.storageKey);
  },

  finishCleanup: async (storageKey: string) => {
    await pool.query(
      `DELETE FROM profile_photo_cleanup_queue
       WHERE storage_key = $1`,
      [storageKey],
    );
  },

  retryCleanup: async (storageKey: string) => {
    await pool.query(
      `UPDATE profile_photo_cleanup_queue
       SET attempts = attempts + 1,
           next_attempt_at = now() + make_interval(
             secs => LEAST(3600 * power(2, LEAST(attempts, 7)), 604800)::int
           )
       WHERE storage_key = $1`,
      [storageKey],
    );
  },
};
