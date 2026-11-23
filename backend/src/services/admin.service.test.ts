import assert from "node:assert/strict";
import { mock, test } from "node:test";
import pool from "../config/db.js";
import { getMemberDetails } from "./admin.service.js";

function queryResult(rows: Array<Record<string, unknown>>) {
  return {
    command: "SELECT",
    rowCount: rows.length,
    oid: 0,
    fields: [],
    rows,
  };
}

test("member details include safe profile, subscription history, and attendance data", async () => {
  const memberId = "00000000-0000-4000-8000-000000000001";
  const query = mock.method(
    pool,
    "query",
    async (sql: string, values?: unknown[]) => {
      if (sql.includes("FROM users") && sql.includes("created_at::date")) {
        assert.deepEqual(values, [memberId]);
        return queryResult([
          {
            id: memberId,
            name: "Test Member",
            phone: "01000000000",
            createdAt: "2026-01-15",
            profilePhotoStorageKey: null,
          },
        ]);
      }

      if (sql.includes("FROM subscriptions s")) {
        return queryResult([
          {
            id: "00000000-0000-4000-8000-000000000003",
            status: "upcoming",
            startDate: "2026-07-01",
            endDate: "2026-07-31",
            remainingDays: 0,
            durationDays: 30,
            price: "900.00",
            createdAt: new Date("2026-06-01T10:00:00.000Z"),
          },
          {
            id: "00000000-0000-4000-8000-000000000002",
            status: "active",
            startDate: "2026-06-01",
            endDate: "2026-07-01",
            remainingDays: 13,
            durationDays: 30,
            price: "800.00",
            createdAt: new Date("2026-05-01T10:00:00.000Z"),
          },
        ]);
      }

      if (sql.includes("LEFT JOIN daily_qr_codes qr")) {
        assert.deepEqual(values, [memberId, "Africa/Cairo"]);
        return queryResult([
          {
            businessDate: "2026-06-18",
            qrGenerated: true,
            scanTimestamp: new Date("2026-06-18T08:30:00.000Z"),
            scanAdminRecorded: true,
            scannedByName: "Gym Admin",
            attendanceRegistered: true,
            attendanceMatchesQr: true,
          },
        ]);
      }

      if (sql.includes("FROM attendance a")) {
        assert.deepEqual(values, [memberId, 50]);
        return queryResult([
          {
            attendanceDate: "2026-06-18",
            scanTimestamp: new Date("2026-06-18T08:30:00.000Z"),
            scannedByName: "Gym Admin",
          },
        ]);
      }

      throw new Error("Unexpected member details query");
    },
  );

  try {
    const details = await getMemberDetails(memberId);

    assert.ok(details);
    assert.deepEqual(Object.keys(details.member).sort(), [
      "createdAt",
      "id",
      "name",
      "phone",
      "profilePhotoUrl",
      "role",
    ]);
    assert.equal(details.member.profilePhotoUrl, null);
    assert.equal(details.currentSubscription?.status, "active");
    assert.equal(details.currentSubscription?.remainingDays, 13);
    assert.equal(details.subscriptionHistory.length, 2);
    assert.equal(details.subscriptionHistory[0]?.status, "upcoming");
    assert.equal(details.attendanceHistory[0]?.scannedByName, "Gym Admin");
    assert.equal(details.attendanceHistoryLimit, 50);
    assert.deepEqual(details.paymentInformation, {
      trackingAvailable: false,
      history: null,
      totalPaid: null,
    });
    assert.equal(details.todayQrAttendance.status, "attended");
    assert.equal(details.todayQrAttendance.scannedByName, "Gym Admin");
    assert.equal(details.todayQrAttendance.attendanceRegistered, true);
  } finally {
    query.mock.restore();
  }
});

test("today's QR status requires a persisted matching scan and attendance", async () => {
  const memberId = "00000000-0000-4000-8000-000000000001";
  const scenarios = [
    {
      name: "no QR",
      row: {
        businessDate: "2026-06-18",
        qrGenerated: false,
        scanTimestamp: null,
        scanAdminRecorded: false,
        scannedByName: null,
        attendanceRegistered: false,
        attendanceMatchesQr: false,
      },
      expected: "no_qr",
    },
    {
      name: "generated but not scanned",
      row: {
        businessDate: "2026-06-18",
        qrGenerated: true,
        scanTimestamp: null,
        scanAdminRecorded: false,
        scannedByName: null,
        attendanceRegistered: false,
        attendanceMatchesQr: false,
      },
      expected: "generated_not_scanned",
    },
    {
      name: "scanned without attendance",
      row: {
        businessDate: "2026-06-18",
        qrGenerated: true,
        scanTimestamp: new Date("2026-06-18T08:30:00.000Z"),
        scanAdminRecorded: true,
        scannedByName: "Gym Admin",
        attendanceRegistered: false,
        attendanceMatchesQr: false,
      },
      expected: "inconsistent",
    },
    {
      name: "scan timestamp without scanner association",
      row: {
        businessDate: "2026-06-18",
        qrGenerated: true,
        scanTimestamp: new Date("2026-06-18T08:30:00.000Z"),
        scanAdminRecorded: false,
        scannedByName: null,
        attendanceRegistered: false,
        attendanceMatchesQr: false,
      },
      expected: "inconsistent",
    },
    {
      name: "attendance without a matching scan",
      row: {
        businessDate: "2026-06-18",
        qrGenerated: true,
        scanTimestamp: null,
        scanAdminRecorded: false,
        scannedByName: null,
        attendanceRegistered: true,
        attendanceMatchesQr: true,
      },
      expected: "inconsistent",
    },
  ] as const;

  for (const scenario of scenarios) {
    const query = mock.method(
      pool,
      "query",
      async (sql: string) => {
        if (sql.includes("FROM users") && sql.includes("created_at::date")) {
          return queryResult([
            {
              id: memberId,
              name: "Test Member",
              phone: "01000000000",
              createdAt: "2026-01-15",
              profilePhotoStorageKey: null,
            },
          ]);
        }
        if (sql.includes("FROM subscriptions s")) {
          return queryResult([]);
        }
        if (sql.includes("FROM attendance a")) {
          return queryResult([]);
        }
        if (sql.includes("LEFT JOIN daily_qr_codes qr")) {
          return queryResult([scenario.row]);
        }

        throw new Error(`Unexpected member details query for ${scenario.name}`);
      },
    );

    try {
      const details = await getMemberDetails(memberId);
      assert.equal(details?.todayQrAttendance.status, scenario.expected);
    } finally {
      query.mock.restore();
    }
  }
});

test("member details stop after an unknown member lookup", async () => {
  let callCount = 0;
  const query = mock.method(pool, "query", async () => {
    callCount += 1;
    return queryResult([]);
  });

  try {
    assert.equal(
      await getMemberDetails("00000000-0000-4000-8000-000000000000"),
      null,
    );
    assert.equal(callCount, 1);
  } finally {
    query.mock.restore();
  }
});
