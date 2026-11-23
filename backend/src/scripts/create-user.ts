
import bcrypt from "bcrypt";
import pool from "../config/db.js";

const createUser = async () => {
  try {
    const name = "admin";
    const phone = "01230000000";
    const password = "memberPassword1";
    const role = "admin";
    const passwordHash = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO users (name, phone_number, password_hash,role)
       VALUES ($1, $2, $3, $4)`,
      [name, phone, passwordHash,role]
    );

    console.log("User created successfully!");
  } catch (error) {
    console.error("Failed to create user:", error);
  } finally {
    await pool.end();
  }
};

createUser();
