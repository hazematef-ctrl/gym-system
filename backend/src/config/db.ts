import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 5432,
  max: 20, 
  idleTimeoutMillis: 30000, 
  connectionTimeoutMillis: 2000, 
  });

export const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log(" PostgreSQL Connected Successfully");
    client.release(); 
  } catch (error) {
    console.error(
      " PostgreSQL Connection Error:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
};

export default pool;