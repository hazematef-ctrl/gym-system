import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { AppError } from "../utils/app-error.js";

const MAX_IMAGE_PIXELS = 40_000_000;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function normalizeProfilePhoto(fileBuffer: Buffer) {
  const detectedType = await fileTypeFromBuffer(fileBuffer);
  if (!detectedType || !ALLOWED_IMAGE_TYPES.has(detectedType.mime)) {
    throw new AppError(
      "Upload a valid JPEG, PNG, or WebP image.",
      415,
      undefined,
      "INVALID_IMAGE",
    );
  }

  try {
    const options = {
      failOn: "error" as const,
      limitInputPixels: MAX_IMAGE_PIXELS,
    };
    const metadata = await sharp(fileBuffer, options).metadata();
    const expectedFormat = {
      "image/jpeg": "jpeg",
      "image/png": "png",
      "image/webp": "webp",
    }[detectedType.mime];

    if (
      metadata.format !== expectedFormat ||
      (metadata.pages !== undefined && metadata.pages > 1)
    ) {
      throw new Error("Image content does not match a supported format");
    }

    return await sharp(fileBuffer, options)
      .rotate()
      .resize(512, 512, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86, effort: 4 })
      .toBuffer();
  } catch {
    throw new AppError(
      "The uploaded file is not a valid supported image.",
      415,
      undefined,
      "INVALID_IMAGE",
    );
  }
}
