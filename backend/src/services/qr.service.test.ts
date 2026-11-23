import assert from "node:assert/strict";
import { test } from "node:test";
import type { PoolClient } from "pg";
import { hashQrToken } from "../config/qr-crypto.js";
import type { AttendanceRow } from "../repositories/attendance.repository.js";
import type { QrScanRow } from "../repositories/qr.repository.js";
import { AppError } from "../utils/app-error.js";
import { scanQr, type QrScanDependencies } from "./qr.service.js";

const TOKEN = "A".repeat(43);
const BUSINESS_DATE = "2026-11-23";
const SCAN_TIME = new Date("2026-11-23T12:30:00.000Z");

function createQr(overrides: Partial<QrScanRow> = {}): QrScanRow {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    userId: "00000000-0000-4000-8000-000000000002",
    subscriptionId: "00000000-0000-4000-8000-000000000003",
    qrDate: BUSINESS_DATE,
    scannedAt: null,
    scannedBy: null,
    memberName: "Test Member",
    memberPhone: "01000000000",
    profilePhotoStorageKey: null,
    ...overrides,
  };
}

function createAttendance(qr: QrScanRow): AttendanceRow {
  return {
    id: "00000000-0000-4000-8000-000000000004",
    userId: qr.userId,
    subscriptionId: qr.subscriptionId,
    qrCodeId: qr.id,
    attendanceDate: qr.qrDate,
    createdAt: SCAN_TIME,
    subscriptionEndDate: "2026-12-01",
  };
}

function createScanFixture(options: {
  qr?: QrScanRow | null;
  attendance?: AttendanceRow | null;
  businessDate?: string;
  activeSubscription?: { endDate: string } | null;
  failAttendanceInsert?: boolean;
} = {}) {
  const state = {
    qr: options.qr === undefined ? createQr() : options.qr,
    attendance: options.attendance ?? null,
    businessDate: options.businessDate ?? BUSINESS_DATE,
    activeSubscription:
      options.activeSubscription === undefined
        ? { endDate: "2026-12-01" }
        : options.activeSubscription,
    failAttendanceInsert: options.failAttendanceInsert ?? false,
    consumedCount: 0,
    attendanceInsertCount: 0,
    commitCount: 0,
    rollbackCount: 0,
    releaseCount: 0,
    qrLockHeld: false,
    lockWaiters: [] as Array<() => void>,
  };
  type ClientContext = {
    snapshotQr: QrScanRow | null;
    snapshotAttendance: AttendanceRow | null;
    hasLock: boolean;
    hasSnapshot: boolean;
  };
  const contexts = new WeakMap<PoolClient, ClientContext>();

  function cloneQr(row: QrScanRow | null) {
    return row
      ? {
          ...row,
          scannedAt: row.scannedAt ? new Date(row.scannedAt) : null,
        }
      : null;
  }

  async function acquireQrLock(context: ClientContext) {
    if (!state.qrLockHeld) {
      state.qrLockHeld = true;
    } else {
      await new Promise<void>((resolve) => state.lockWaiters.push(resolve));
    }

    context.hasLock = true;
    context.snapshotQr = cloneQr(state.qr);
    context.snapshotAttendance = state.attendance
      ? { ...state.attendance }
      : null;
    context.hasSnapshot = true;
  }

  function releaseQrLock(context: ClientContext) {
    if (!context.hasLock) {
      return;
    }

    context.hasLock = false;
    const next = state.lockWaiters.shift();
    if (next) {
      next();
    } else {
      state.qrLockHeld = false;
    }
  }

  const dependencies: QrScanDependencies = {
    connect: async () => {
      const context: ClientContext = {
        snapshotQr: null,
        snapshotAttendance: null,
        hasLock: false,
        hasSnapshot: false,
      };

      const client = {
        query: async (text: string) => {
          if (text === "BEGIN") {
            return { rows: [] };
          }
          if (text === "COMMIT") {
            state.commitCount += 1;
            return { rows: [] };
          }
          if (text === "ROLLBACK") {
            state.rollbackCount += 1;
            if (context.hasSnapshot) {
              state.qr = cloneQr(context.snapshotQr);
              state.attendance = context.snapshotAttendance;
            }
            return { rows: [] };
          }
          throw new Error(`Unexpected SQL in scan test: ${text}`);
        },
        release: () => {
          state.releaseCount += 1;
          releaseQrLock(context);
        },
      } as unknown as PoolClient;

      contexts.set(client, context);
      return client;
    },

    findQr: async (client, tokenHash) => {
      if (!state.qr || !hashQrToken(TOKEN).equals(tokenHash)) {
        return null;
      }
      const context = contexts.get(client);
      assert.ok(context);
      await acquireQrLock(context);
      return cloneQr(state.qr);
    },
    findAttendance: async () =>
      state.attendance ? { ...state.attendance } : null,
    getBusinessDate: async () => state.businessDate,
    findActiveSubscription: async () =>
      state.activeSubscription ? { ...state.activeSubscription } : null,
    consumeQr: async (_client, qrId, adminId) => {
      if (!state.qr || state.qr.id !== qrId || state.qr.scannedAt) {
        return null;
      }
      state.qr.scannedAt = SCAN_TIME;
      state.qr.scannedBy = adminId;
      state.consumedCount += 1;
      return { scannedAt: SCAN_TIME };
    },
    insertAttendance: async (_client, input) => {
      state.attendanceInsertCount += 1;
      if (state.failAttendanceInsert) {
        throw new Error("Injected attendance insert failure");
      }
      if (state.attendance) {
        throw new Error("Duplicate attendance");
      }
      state.attendance = {
        id: "00000000-0000-4000-8000-000000000004",
        userId: input.userId,
        subscriptionId: input.subscriptionId,
        qrCodeId: input.qrCodeId,
        attendanceDate: input.attendanceDate,
        createdAt: SCAN_TIME,
        subscriptionEndDate: input.subscriptionEndDate,
      };
      return { ...state.attendance };
    },
    getPhotoUrls: async () => [null],
  };

  return { dependencies, state };
}

function hasErrorCode(code: string) {
  return (error: unknown) =>
    error instanceof AppError && error.code === code;
}

test("valid QR is consumed and attendance commits once", async () => {
  const { dependencies, state } = createScanFixture();
  const result = await scanQr(TOKEN, "admin-1", dependencies);

  assert.equal(result.alreadyProcessed, false);
  assert.equal(result.member.name, "Test Member");
  assert.equal(result.attendance.date, BUSINESS_DATE);
  assert.equal(state.consumedCount, 1);
  assert.equal(state.attendanceInsertCount, 1);
  assert.equal(state.commitCount, 1);
  assert.equal(state.rollbackCount, 0);
  assert.equal(state.qr?.scannedBy, "admin-1");
});

test("unknown, expired-date, and inactive-subscription QR codes are rejected", async () => {
  const unknown = createScanFixture({ qr: null });
  await assert.rejects(
    scanQr(TOKEN, "admin-1", unknown.dependencies),
    hasErrorCode("INVALID_QR"),
  );

  const oldDate = createScanFixture({
    qr: createQr({ qrDate: "2026-11-22" }),
  });
  await assert.rejects(
    scanQr(TOKEN, "admin-1", oldDate.dependencies),
    hasErrorCode("QR_EXPIRED"),
  );
  assert.equal(oldDate.state.consumedCount, 0);

  const inactive = createScanFixture({ activeSubscription: null });
  await assert.rejects(
    scanQr(TOKEN, "admin-1", inactive.dependencies),
    hasErrorCode("SUBSCRIPTION_INACTIVE"),
  );
  assert.equal(inactive.state.consumedCount, 0);
});

test("a successful retry returns the original attendance unchanged", async () => {
  const qr = createQr({
    scannedAt: SCAN_TIME,
    scannedBy: "admin-original",
  });
  const originalAttendance = createAttendance(qr);
  const { dependencies, state } = createScanFixture({
    qr,
    attendance: originalAttendance,
  });

  const result = await scanQr(TOKEN, "admin-retry", dependencies);

  assert.equal(result.alreadyProcessed, true);
  assert.equal(result.attendance.timestamp, SCAN_TIME.toISOString());
  assert.equal(state.attendanceInsertCount, 0);
  assert.equal(state.consumedCount, 0);
  assert.equal(state.qr?.scannedBy, "admin-original");
});

test("a consumed QR without attendance is an integrity error", async () => {
  const { dependencies, state } = createScanFixture({
    qr: createQr({ scannedAt: SCAN_TIME, scannedBy: "admin-1" }),
  });

  await assert.rejects(
    scanQr(TOKEN, "admin-2", dependencies),
    hasErrorCode("QR_ATTENDANCE_INTEGRITY_ERROR"),
  );
  assert.equal(state.attendanceInsertCount, 0);
  assert.equal(state.rollbackCount, 1);
});

test("attendance insertion failure rolls QR consumption back", async () => {
  const { dependencies, state } = createScanFixture({
    failAttendanceInsert: true,
  });

  await assert.rejects(
    scanQr(TOKEN, "admin-1", dependencies),
    /Injected attendance insert failure/,
  );
  assert.equal(state.qr?.scannedAt, null);
  assert.equal(state.qr?.scannedBy, null);
  assert.equal(state.attendance, null);
  assert.equal(state.commitCount, 0);
  assert.equal(state.rollbackCount, 1);
  assert.equal(state.releaseCount, 1);
});

test("concurrent scans produce one attendance and an idempotent retry", async () => {
  const { dependencies, state } = createScanFixture();
  const [first, second] = await Promise.all([
    scanQr(TOKEN, "admin-1", dependencies),
    scanQr(TOKEN, "admin-2", dependencies),
  ]);

  assert.equal(first.alreadyProcessed, false);
  assert.equal(second.alreadyProcessed, true);
  assert.equal(state.attendanceInsertCount, 1);
  assert.equal(state.consumedCount, 1);
  assert.equal(state.qr?.scannedBy, "admin-1");
  assert.equal(state.attendance?.createdAt.toISOString(), first.attendance.timestamp);
});
