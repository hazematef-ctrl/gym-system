import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { AppError } from "../utils/app-error.js";
import { processProfilePhotoCleanupQueue } from "../services/profile-photo-cleanup.service.js";

const router = Router();

function isAuthorizedCronRequest(authorization: string | undefined) {
  const secret = process.env.CRON_SECRET;
  const provided = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";

  if (!secret || !provided) {
    return false;
  }

  const expectedBuffer = Buffer.from(secret, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");
  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

router.get("/profile-photo-cleanup", async (req, res, next) => {
  if (!process.env.CRON_SECRET) {
    return next(
      new AppError(
        "Scheduled cleanup is not configured.",
        503,
        undefined,
        "CRON_NOT_CONFIGURED",
      ),
    );
  }

  if (!isAuthorizedCronRequest(req.get("authorization"))) {
    return next(
      new AppError(
        "Scheduled cleanup authorization failed.",
        401,
        undefined,
        "UNAUTHORIZED",
      ),
    );
  }

  try {
    const result = await processProfilePhotoCleanupQueue();
    if (result.failed > 0) {
      return res.status(503).json({
        success: false,
        message: "Some profile photo cleanup tasks were rescheduled.",
        data: result,
      });
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
