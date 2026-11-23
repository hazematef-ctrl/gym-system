import { Router } from "express";
import {
  currentSubscriptionController,
} from "../controllers/subscription.controller.js";
import { renewSubscriptionController } from "../controllers/admin.controller.js";
import { authenticate, requireAdmin } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validation.js";
import {
  subscriptionTermSchema,
  subscriptionUserParamsSchema,
} from "../schemas/subscription.schema.js";

const router = Router();

router.get("/current", authenticate, currentSubscriptionController);
router.post(
  "/users/:userId/renew",
  authenticate,
  requireAdmin,
  validateRequest(subscriptionUserParamsSchema, "params"),
  validateRequest(subscriptionTermSchema),
  renewSubscriptionController,
);

export default router;
