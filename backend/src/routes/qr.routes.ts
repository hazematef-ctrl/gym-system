import { Router } from "express";
import {
  generateDailyQrController,
  scanQrController,
} from "../controllers/qr.controller.js";
import {
  authenticate,
  requireAdmin,
  requireMember,
} from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validation.js";
import {
  generateQrSchema,
  scanQrSchema,
} from "../schemas/qr.schema.js";

const router = Router();

router.post(
  "/generate",
  authenticate,
  requireMember,
  validateRequest(generateQrSchema),
  generateDailyQrController,
);

router.post(
  "/scan",
  authenticate,
  requireAdmin,
  validateRequest(scanQrSchema),
  scanQrController,
);

export default router;
