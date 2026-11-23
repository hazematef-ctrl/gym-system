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
import { attendanceRepository } from "../repositories/attendance.repository.js";
import { getProfilePhotoUrls } from "./profile-photo.service.js";
import type { PoolClient } from "pg";

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

export type QrScanDependencies = {
  connect: () => Promise<PoolClient>;
  findQr: typeof qrRepository.findForScanByTokenHash;
  findAttendance: typeof attendanceRepository.findByQrCode;
  getBusinessDate: typeof qrRepository.getBusinessDate;
  findActiveSubscription: typeof attendanceRepository.findActiveSubscriptionForScan;
  consumeQr: typeof qrRepository.consumeForScan;
  insertAttendance: typeof attendanceRepository.insert;
  getPhotoUrls: typeof getProfilePhotoUrls;
};

const defaultQrScanDependencies: QrScanDependencies = {
  connect: () => pool.connect(),
  findQr: qrRepository.findForScanByTokenHash,
  findAttendance: attendanceRepository.findByQrCode,
  getBusinessDate: qrRepository.getBusinessDate,
  findActiveSubscription: attendanceRepository.findActiveSubscriptionForScan,
  consumeQr: qrRepository.consumeForScan,
  insertAttendance: attendanceRepository.insert,
  getPhotoUrls: getProfilePhotoUrls,
};

export async function scanQr(
  token: string,
  adminId: string,
  dependencies: QrScanDependencies = defaultQrScanDependencies,
) {
  const client = await dependencies.connect();
  let transactionStarted = false;
  let scanRecord: Awaited<
    ReturnType<typeof qrRepository.findForScanByTokenHash>
  > | null = null;
  let attendance: Awaited<
    ReturnType<typeof attendanceRepository.findByQrCode>
  > | null = null;
  let alreadyProcessed = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    scanRecord = await dependencies.findQr(
      client,
      hashQrToken(token),
    );
    if (!scanRecord) {
      throw new AppError("This QR code is not valid.", 404, undefined, "INVALID_QR");
    }

    attendance = await dependencies.findAttendance(
      client,
      scanRecord.id,
    );

    if (scanRecord.scannedAt) {
      if (!attendance) {
        console.error("Consumed QR has no attendance record", scanRecord.id);
        throw new AppError(
          "This QR code has an inconsistent attendance record.",
          500,
          undefined,
          "QR_ATTENDANCE_INTEGRITY_ERROR",
        );
      }

      if (
        attendance.userId !== scanRecord.userId ||
        attendance.subscriptionId !== scanRecord.subscriptionId ||
        attendance.attendanceDate !== scanRecord.qrDate ||
        scanRecord.scannedBy === null
      ) {
        console.error(
          "Consumed QR attendance does not match its QR record",
          scanRecord.id,
        );
        throw new AppError(
          "This QR code has an inconsistent attendance record.",
          500,
          undefined,
          "QR_ATTENDANCE_INTEGRITY_ERROR",
        );
      }

      alreadyProcessed = true;
    } else {
      if (attendance) {
        console.error("Attendance exists for an unconsumed QR", scanRecord.id);
        throw new AppError(
          "This QR code has an inconsistent attendance record.",
          500,
          undefined,
          "QR_ATTENDANCE_INTEGRITY_ERROR",
        );
      }

      const businessDate = await dependencies.getBusinessDate(
        client,
        BUSINESS_TIME_ZONE,
      );
      if (scanRecord.qrDate !== businessDate) {
        throw new AppError(
          "This QR code has expired.",
          410,
          undefined,
          "QR_EXPIRED",
        );
      }

      const activeSubscription =
        await dependencies.findActiveSubscription(
          client,
          scanRecord.userId,
          scanRecord.subscriptionId,
          businessDate,
        );
      if (!activeSubscription) {
        throw new AppError(
          "The member's subscription is not active for today.",
          403,
          undefined,
          "SUBSCRIPTION_INACTIVE",
        );
      }

      const consumed = await dependencies.consumeQr(
        client,
        scanRecord.id,
        adminId,
        businessDate,
      );
      if (!consumed) {
        throw new AppError(
          "This QR code has already been used.",
          409,
          undefined,
          "QR_ALREADY_USED",
        );
      }

      attendance = await dependencies.insertAttendance(client, {
        userId: scanRecord.userId,
        subscriptionId: scanRecord.subscriptionId,
        qrCodeId: scanRecord.id,
        attendanceDate: businessDate,
        subscriptionEndDate: activeSubscription.endDate,
      });
    }

    await client.query("COMMIT");
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          "QR scan failed and the transaction could not be rolled back",
        );
      }
    }

    throw error;
  } finally {
    client.release();
  }

  if (!scanRecord || !attendance) {
    throw new Error("QR scan completed without an attendance result");
  }

  const [profilePhotoUrl] = await dependencies.getPhotoUrls([
    scanRecord.profilePhotoStorageKey,
  ]);

  return {
    alreadyProcessed,
    member: {
      id: scanRecord.userId,
      name: scanRecord.memberName,
      phone: scanRecord.memberPhone,
      profilePhotoUrl: profilePhotoUrl ?? null,
    },
    subscription: {
      status: "active" as const,
      endDate: attendance.subscriptionEndDate,
    },
    attendance: {
      date: attendance.attendanceDate,
      timestamp: attendance.createdAt.toISOString(),
    },
  };
}
