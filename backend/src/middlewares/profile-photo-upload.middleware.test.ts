import assert from "node:assert/strict";
import { createServer } from "node:http";
import express from "express";
import { test } from "node:test";
import { errorHandler } from "./error-handler.middleware.js";
import { receiveProfilePhoto } from "./profile-photo-upload.middleware.js";

test("photo upload middleware rejects files larger than 5 MB", async () => {
  const app = express();
  app.put("/photo", receiveProfilePhoto, (_req, res) => {
    res.status(204).end();
  });
  app.use(errorHandler);

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  try {
    const formData = new FormData();
    formData.append(
      "photo",
      new Blob([Buffer.alloc(5 * 1024 * 1024 + 1)], {
        type: "image/png",
      }),
      "oversized.png",
    );
    const response = await fetch(`http://127.0.0.1:${address.port}/photo`, {
      method: "PUT",
      body: formData,
    });
    const result = (await response.json()) as {
      code?: string;
      success: boolean;
    };

    assert.equal(response.status, 413);
    assert.equal(result.success, false);
    assert.equal(result.code, "PHOTO_TOO_LARGE");
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
