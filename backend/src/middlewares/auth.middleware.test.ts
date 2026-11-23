import assert from "node:assert/strict";
import { mock, test } from "node:test";
import type { Request, Response } from "express";
import { authenticate, requireAdmin } from "./auth.middleware.js";
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/app-error.js";

function requestWithSession(userId: string) {
  return { session: { userId } } as unknown as Request;
}

test("session authentication rejects requests without an account", () => {
  let responseStatus = 0;
  let responseBody: unknown;
  const req = { session: {} } as unknown as Request;
  const res = {
    status(status: number) {
      responseStatus = status;
      return this;
    },
    json(body: unknown) {
      responseBody = body;
      return this;
    },
  } as unknown as Response;

  authenticate(req, res, () => undefined);

  assert.equal(responseStatus, 401);
  assert.equal(
    (responseBody as { code?: string }).code,
    "UNAUTHORIZED",
  );
});

test("member sessions are denied and admin sessions pass the admin guard", async () => {
  const roleLookup = mock.method(
    userRepository,
    "findRoleById",
    async () => "member",
  );
  try {
    let denied: unknown;
    await requireAdmin(
      requestWithSession("member-id"),
      {} as Response,
      (error?: unknown) => {
        denied = error;
      },
    );
    assert.ok(denied instanceof AppError);
    assert.equal(denied.code, "FORBIDDEN");

    roleLookup.mock.mockImplementation(async () => "admin");
    let passed = false;
    await requireAdmin(
      requestWithSession("admin-id"),
      {} as Response,
      (error?: unknown) => {
        assert.equal(error, undefined);
        passed = true;
      },
    );
    assert.equal(passed, true);
  } finally {
    roleLookup.mock.restore();
  }
});
