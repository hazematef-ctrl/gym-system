
import bcrypt from "bcrypt";
import pool from "../config/db.js";
import type {
  ChangePasswordDTO,
  LoginDTO,
} from "../schemas/user.schema.js";
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/app-error.js";

export const loginUser = async (data: LoginDTO) => {
  const { phone, password } = data;

  // 1. Find user by phone
  const user = await userRepository.findByPhone(phone);

  if (!user) {
    throw new AppError("Invalid phone number or password", 401);
  }

  // 2. Compare password with hashed password
  const isPasswordValid = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!isPasswordValid) {
    throw new AppError("Invalid phone number or password", 401);
  }

  // 3. Return safe user data
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
  };
};

export const getCurrentUser = async (id: string) => {
  const user = await userRepository.findProfileById(id);

  if (!user) {
    throw new AppError("Unauthorized. Please login first.", 401);
  }

  return user;
};

export const changeOwnPassword = async (
  userId: string,
  currentSessionId: string,
  data: ChangePasswordDTO,
) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const user = await userRepository.findPasswordHashForUpdate(client, userId);
    if (!user) {
      throw new AppError("Your account could not be found.", 401);
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      data.currentPassword,
      user.passwordHash,
    );
    if (!isCurrentPasswordValid) {
      throw new AppError("Current password is incorrect.", 400);
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 12);
    await userRepository.updatePasswordAndRevokeOtherSessions(
      client,
      userId,
      currentSessionId,
      passwordHash,
    );

    await client.query("COMMIT");
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          "Password change failed and the transaction could not be rolled back",
        );
      }
    }

    throw error;
  } finally {
    client.release();
  }
};
