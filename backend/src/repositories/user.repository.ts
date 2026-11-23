
import pool from "../config/db.js";
import type { PoolClient } from "pg";

export const userRepository = {
  findByPhone: async (phone: string) => {
    const result = await pool.query(
      `SELECT
        id,
        name,
        phone_number AS phone,
        password_hash AS "passwordHash",
        role
       FROM users
       WHERE phone_number = $1
       LIMIT 1`,
      [phone]
    );

    return result.rows[0] ?? null;
  },

  findPasswordHashForUpdate: async (client: PoolClient, id: string) => {
    const result = await client.query<{ passwordHash: string }>(
      `SELECT password_hash AS "passwordHash"
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [id],
    );

    return result.rows[0] ?? null;
  },

  updatePasswordAndRevokeOtherSessions: async (
    client: PoolClient,
    userId: string,
    currentSessionId: string,
    passwordHash: string,
  ) => {
    await client.query(
      `UPDATE users
       SET password_hash = $2
       WHERE id = $1`,
      [userId, passwordHash],
    );

    await client.query(
      `DELETE FROM user_sessions
       WHERE sid <> $1
         AND sess ->> 'userId' = $2`,
      [currentSessionId, userId],
    );
  },

  findRoleById: async (id: string) => {
    const result = await pool.query(
      `SELECT role
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [id],
    );

    return result.rows[0]?.role as string | undefined;
  },

  findAll: async (phone: string) => {
    const result = await pool.query(
      `SELECT
        id,
        name,
        phone_number AS phone,
        role
       FROM users
       WHERE ($1 = '' OR strpos(phone_number, $1) > 0)
       ORDER BY name ASC`,
      [phone],
    );

    return result.rows;
  },

  findPublicById: async (id: string) => {
    const result = await pool.query(
      `SELECT
        id,
        name,
        phone_number AS phone
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [id],
    );

    return result.rows[0] ?? null;
  },

  findProfileById: async (id: string) => {
    const result = await pool.query(
      `SELECT
        id,
        name,
        phone_number AS phone,
        role
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [id],
    );

    return result.rows[0] ?? null;
  },

  lockMemberForRenewal: async (client: PoolClient, id: string) => {
    const result = await client.query(
      `SELECT id
       FROM users
       WHERE id = $1 AND role = 'member'
       FOR UPDATE`,
      [id],
    );

    return result.rows[0] ?? null;
  },

  create: async (
    client: PoolClient,
    name: string,
    phone: string,
    passwordHash: string,
  ) => {
    const result = await client.query(
      `INSERT INTO users (name, phone_number, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, phone_number AS phone, role`,
      [name, phone, passwordHash],
    );

    return result.rows[0];
  },
};
