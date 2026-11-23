import bcrypt from "bcrypt";
import pool from "../config/db.js";
import type { CreateUserDTO } from "../schemas/user.schema.js";
import type { SubscriptionTermDTO } from "../schemas/subscription.schema.js";
import { subscriptionRepository } from "../repositories/subscription.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/app-error.js";

const BUSINESS_TIME_ZONE = "Africa/Cairo";

function hasPgErrorCode(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

export const listUsers = (phone: string) => userRepository.findAll(phone);

export const addUser = async (data: CreateUserDTO) => {
  const passwordHash = await bcrypt.hash(data.password, 12);
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const user = await userRepository.create(
      client,
      data.name,
      data.phone,
      passwordHash,
    );
    const subscription = await subscriptionRepository.createForUser(
      client,
      user.id,
      data.subscriptionDays,
      data.price,
      BUSINESS_TIME_ZONE,
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return { ...user, subscription };
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          "Member creation failed and the transaction could not be rolled back",
        );
      }
    }

    if (hasPgErrorCode(error, "23505")) {
      throw new AppError("A user with this phone number already exists", 409);
    }

    throw error;
  } finally {
    client.release();
  }
};

export const renewMemberSubscription = async (
  userId: string,
  term: SubscriptionTermDTO,
) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const member = await userRepository.lockMemberForRenewal(client, userId);
    if (!member) {
      throw new AppError("Member not found", 404);
    }

    await subscriptionRepository.expireEndedForUser(
      client,
      userId,
      BUSINESS_TIME_ZONE,
    );
    const subscription = await subscriptionRepository.createForUser(
      client,
      userId,
      term.subscriptionDays,
      term.price,
      BUSINESS_TIME_ZONE,
    );

    await client.query("COMMIT");
    transactionStarted = false;
    return subscription;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          "Subscription renewal failed and the transaction could not be rolled back",
        );
      }
    }

    if (hasPgErrorCode(error, "23P01")) {
      throw new AppError("The subscription would overlap an existing term", 409);
    }

    throw error;
  } finally {
    client.release();
  }
};
