import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const databaseUrl =
  process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;

const pool = new Pool({
  ...(databaseUrl
    ? { connectionString: databaseUrl }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: Number(process.env.DB_PORT) || 5432,
      }),
  ...(process.env.NODE_ENV === "production"
    ? { ssl: { rejectUnauthorized: false } }
    : {}),
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const connectDB = async () => {
  const client = await pool.connect();
  try {
    console.log(" PostgreSQL Connected Successfully");
  } finally {
    client.release();
  }
};

export default pool;