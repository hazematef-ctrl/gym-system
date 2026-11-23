import { AppError } from "../utils/app-error.js";
import pool from "../config/db.js";
import {
  createQrToken,
  decryptQrToken,
  encryptQrToken,
  hashQrToken,
  QrEncryptionConfigurationError,
  qrTokenMatchesHash,
} from "../config/qr-crypto.js";
import { qrRepository, type DailyQrRow } from "../repositories/qr.repository.js";
import { subscriptionRepository } from "../repositories/subscription.repository.js";

const BUSINESS_TIME_ZONE = "Africa/Cairo";

function associatedData(userId: string, subscriptionId: string, qrDate: string) {
  return `${userId}:${subscriptionId}:${qrDate}`;
}

function recoverExistingToken(row: DailyQrRow) {
  if (row.scannedAt) {
    throw new AppError("Today's QR code has already been scanned", 409);
  }

  let token: string;
  try {
    token = decryptQrToken(
      {
        ciphertext: row.ciphertext,
        iv: row.iv,
        authTag: row.authTag,
        keyVersion: row.keyVersion,
      },
      associatedData(row.userId, row.subscriptionId, row.qrDate),
    );
  } catch {
    throw new AppError(
      "Today's QR exists but could not be securely recovered; check the configured QR encryption keys.",
      503,
    );
  }

  if (!qrTokenMatchesHash(token, row.tokenHash)) {
    throw new AppError(
      "Today's QR exists but failed token integrity verification.",
      503,
    );
  }

  return token;
}

export async function generateDailyQr(userId: string) {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const subscription = await subscriptionRepository.findActiveForUser(
      client,
      userId,
      BUSINESS_TIME_ZONE,
    );
    if (!subscription) {
      throw new AppError("An active subscription is required to generate a QR code", 403);
    }

    const qrDate = await qrRepository.getBusinessDate(
      client,
      BUSINESS_TIME_ZONE,
    );
    const existing = await qrRepository.findForUserDate(
      client,
      userId,
      qrDate,
    );

    if (existing) {
      if (existing.subscriptionId !== subscription.id) {
        throw new AppError(
          "Today's QR is already associated with a different subscription",
          409,
        );
      }

      const token = recoverExistingToken(existing);
      await client.query("COMMIT");
      transactionStarted = false;
      return { token, qrDate, reused: true };
    }

    const token = createQrToken();
    const encrypted = encryptQrToken(
      token,
      associatedData(userId, subscription.id, qrDate),
    );
    const inserted = await qrRepository.insertIfAbsent(client, {
      userId,
      subscriptionId: subscription.id,
      qrDate,
      tokenHash: hashQrToken(token),
      encrypted,
    });

    let responseToken = token;
    let reused = false;
    if (!inserted) {
      const concurrentQr = await qrRepository.findForUserDate(
        client,
        userId,
        qrDate,
      );
      if (!concurrentQr) {
        throw new Error("QR conflict occurred without a daily QR record");
      }
      if (concurrentQr.subscriptionId !== subscription.id) {
        throw new AppError(
          "Today's QR is already associated with a different subscription",
          409,
        );
      }

      responseToken = recoverExistingToken(concurrentQr);
      reused = true;
    }

    await client.query("COMMIT");
    transactionStarted = false;
    return { token: responseToken, qrDate, reused };
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          "QR generation failed and the transaction could not be rolled back",
        );
      }
    }

    if (error instanceof QrEncryptionConfigurationError) {
      throw new AppError(
        "QR generation is unavailable because the server encryption key is not configured correctly.",
        503,
      );
    }

    throw error;
  } finally {
    client.release();
  }
}
