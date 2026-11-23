import { Router } from "express";
import { generateDailyQrController } from "../controllers/qr.controller.js";
import {
  authenticate,
  requireMember,
} from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validation.js";
import { generateQrSchema } from "../schemas/qr.schema.js";

const router = Router();

router.post(
  "/generate",
  authenticate,
  requireMember,
  validateRequest(generateQrSchema),
  generateDailyQrController,
);

export default router;
