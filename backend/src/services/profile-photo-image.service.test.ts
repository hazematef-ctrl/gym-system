import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { AppError } from "../utils/app-error.js";
import { normalizeProfilePhoto } from "./profile-photo-image.service.js";

test("valid PNG photos are decoded and normalized to bounded WebP", async () => {
  const png = await sharp({
    create: {
      width: 1200,
      height: 800,
      channels: 3,
      background: { r: 30, g: 150, b: 80 },
    },
  })
    .png()
    .toBuffer();

  const normalized = await normalizeProfilePhoto(png);
  const metadata = await sharp(normalized).metadata();

  assert.equal(metadata.format, "webp");
  assert.ok(metadata.width !== undefined && metadata.width <= 512);
  assert.ok(metadata.height !== undefined && metadata.height <= 512);
});

test("unsupported and corrupted image contents are rejected", async () => {
  await assert.rejects(
    normalizeProfilePhoto(Buffer.from("<svg></svg>")),
    (error: unknown) =>
      error instanceof AppError && error.code === "INVALID_IMAGE",
  );

  await assert.rejects(
    normalizeProfilePhoto(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ),
    (error: unknown) =>
      error instanceof AppError && error.code === "INVALID_IMAGE",
  );
});
