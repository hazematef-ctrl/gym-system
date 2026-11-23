import assert from "node:assert/strict";
import { mock, test } from "node:test";
import pool from "../config/db.js";
import { userRepository } from "./user.repository.js";

function queryResult(rows: Array<Record<string, unknown>>) {
  return {
    command: "SELECT",
    rowCount: rows.length,
    oid: 0,
    fields: [],
    rows,
  };
}

test("members query falls back when the optional photo column is missing", async () => {
  let callCount = 0;
  const query = mock.method(
    pool,
    "query",
    async (sql: string, _values?: unknown[]) => {
      callCount += 1;
      if (sql.includes("profile_photo_storage_key")) {
        throw Object.assign(
          new Error('column "profile_photo_storage_key" does not exist'),
          { code: "42703" },
        );
      }

      return queryResult([
        {
          id: "member-id",
          name: "Test Member",
          phone: "0000000000",
          profilePhotoStorageKey: null,
          role: "member",
        },
      ]);
    },
  );

  try {
    const members = await userRepository.findAll("");

    assert.equal(callCount, 2);
    assert.equal(members.length, 1);
    assert.equal(members[0]?.profilePhotoStorageKey, null);
    assert.equal("passwordHash" in (members[0] ?? {}), false);
  } finally {
    query.mock.restore();
  }
});

test("members query preserves empty results and propagates unrelated database errors", async () => {
  const emptyQuery = mock.method(pool, "query", async () =>
    queryResult([]),
  );
  try {
    assert.deepEqual(await userRepository.findAll(""), []);
  } finally {
    emptyQuery.mock.restore();
  }

  const databaseError = Object.assign(new Error("database unavailable"), {
    code: "08006",
  });
  let callCount = 0;
  const failingQuery = mock.method(pool, "query", async () => {
    callCount += 1;
    throw databaseError;
  });
  try {
    await assert.rejects(userRepository.findAll(""), (error: unknown) => {
      assert.equal(error, databaseError);
      return true;
    });
    assert.equal(callCount, 1);
  } finally {
    failingQuery.mock.restore();
  }
});
