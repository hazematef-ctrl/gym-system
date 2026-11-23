import bcrypt from "bcrypt";
import pool from "../config/db.js";
import type { CreateUserDTO } from "../schemas/user.schema.js";
import type { SubscriptionTermDTO } from "../schemas/subscription.schema.js";
import { subscriptionRepository } from "../repositories/subscription.repository.js";
import { attendanceRepository } from "../repositories/attendance.repository.js";
import { qrRepository } from "../repositories/qr.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/app-error.js";
import {
  getProfilePhotoUrls,
} from "./profile-photo.service.js";

const BUSINESS_TIME_ZONE = "Africa/Cairo";
const MEMBER_ATTENDANCE_HISTORY_LIMIT = 50;

export type MemberSubscriptionStatus =
  | "active"
  | "upcoming"
  | "expired"
  | "cancelled";

export type MemberSubscriptionDetails = {
  id: string;
  status: MemberSubscriptionStatus;
  startDate: string;
  endDate: string;
  remainingDays: number;
  durationDays: number;
  price: string;
  createdAt: string;
};

export type MemberDetailsDto = {
  member: {
    id: string;
    name: string;
    phone: string;
    role: "member";
    createdAt: string;
    profilePhotoUrl: string | null;
  };
  currentSubscription: MemberSubscriptionDetails | null;
  subscriptionHistory: MemberSubscriptionDetails[];
  attendanceHistory: Array<{
    attendanceDate: string;
    scanTimestamp: string | null;
    scannedByName: string | null;
  }>;
  attendanceHistoryLimit: number;
  paymentInformation: {
    trackingAvailable: false;
    history: null;
    totalPaid: null;
  };
  todayQrAttendance: {
    businessDate: string;
    status:
      | "attended"
      | "generated_not_scanned"
      | "no_qr"
      | "inconsistent";
    qrGenerated: boolean;
    scannedAt: string | null;
    scannedByName: string | null;
    attendanceRegistered: boolean;
  };
};

function hasPgErrorCode(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

export const listUsers = async (phone: string) => {
  const users = await userRepository.findAll(phone);
  const photoUrls = await getProfilePhotoUrls(
    users.map((user) => user.profilePhotoStorageKey),
  );

  return users.map((user, index) => {
    const { profilePhotoStorageKey: _storageKey, ...publicUser } = user;
    return {
      ...publicUser,
      profilePhotoUrl: photoUrls[index] ?? null,
    };
  });
};

export const getMemberDetails = async (
  memberId: string,
): Promise<MemberDetailsDto | null> => {
  const member = await userRepository.findMemberDetailsById(memberId);
  if (!member) {
    return null;
  }

  const [
    subscriptions,
    attendanceHistory,
    photoUrls,
    todayQrAttendanceRow,
  ] = await Promise.all([
    subscriptionRepository.findHistoryForUser(
      memberId,
      BUSINESS_TIME_ZONE,
    ),
    attendanceRepository.findHistoryForUser(
      memberId,
      MEMBER_ATTENDANCE_HISTORY_LIMIT,
    ),
    getProfilePhotoUrls([member.profilePhotoStorageKey]),
    qrRepository.findTodayAttendanceStatus(memberId, BUSINESS_TIME_ZONE),
  ]);
  const subscriptionHistory = subscriptions.map((subscription) => ({
    ...subscription,
    createdAt: subscription.createdAt.toISOString(),
  }));
  const currentSubscription =
    subscriptionHistory.find(
      (subscription) => subscription.status === "active",
    ) ??
    subscriptionHistory
      .filter((subscription) => subscription.status === "upcoming")
      .sort((left, right) => left.startDate.localeCompare(right.startDate))[0] ??
    subscriptionHistory[0] ??
    null;
  const scanRecorded =
    todayQrAttendanceRow.scanTimestamp !== null ||
    todayQrAttendanceRow.scanAdminRecorded;
  const hasSuccessfulScan =
    todayQrAttendanceRow.scanTimestamp !== null &&
    todayQrAttendanceRow.scanAdminRecorded;
  const todayQrStatus: MemberDetailsDto["todayQrAttendance"]["status"] =
    !todayQrAttendanceRow.qrGenerated
      ? todayQrAttendanceRow.attendanceRegistered
        ? "inconsistent"
        : "no_qr"
      : !scanRecorded && !todayQrAttendanceRow.attendanceRegistered
        ? "generated_not_scanned"
        : hasSuccessfulScan &&
            todayQrAttendanceRow.attendanceRegistered &&
            todayQrAttendanceRow.attendanceMatchesQr
          ? "attended"
          : "inconsistent";

  return {
    member: {
      id: member.id,
      name: member.name,
      phone: member.phone,
      role: "member",
      createdAt: member.createdAt,
      profilePhotoUrl: photoUrls[0] ?? null,
    },
    currentSubscription,
    subscriptionHistory,
    attendanceHistory: attendanceHistory.map((attendance) => ({
      attendanceDate: attendance.attendanceDate,
      scanTimestamp: attendance.scanTimestamp?.toISOString() ?? null,
      scannedByName: attendance.scannedByName,
    })),
    attendanceHistoryLimit: MEMBER_ATTENDANCE_HISTORY_LIMIT,
    paymentInformation: {
      trackingAvailable: false,
      history: null,
      totalPaid: null,
    },
    todayQrAttendance: {
      businessDate: todayQrAttendanceRow.businessDate,
      status: todayQrStatus,
      qrGenerated: todayQrAttendanceRow.qrGenerated,
      scannedAt: todayQrAttendanceRow.scanTimestamp?.toISOString() ?? null,
      scannedByName: todayQrAttendanceRow.scannedByName,
      attendanceRegistered: todayQrAttendanceRow.attendanceRegistered,
    },
  };
};

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
