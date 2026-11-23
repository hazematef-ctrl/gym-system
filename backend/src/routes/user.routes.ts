import { Router } from "express";
import {
  createUserSchema,
  changePasswordSchema,
  loginSchema,
  memberPhotoParamsSchema,
  userSearchQuerySchema,
  userIdParamsSchema,
} from "../schemas/user.schema.js";
import { validateRequest } from "../middlewares/validation.js";
import {
  jwtCookieLoginController,
  jwtCookieLogoutController,
  jwtLoginController,
  changePasswordController,
  loginController,
  profileController,
} from "../controllers/auth.controller.js";
import { authenticate, requireAdmin } from "../middlewares/auth.middleware.js";
import { logoutController } from "../controllers/auth.controller.js";
import {
  createUserController,
  getMemberDetailsController,
  getUserByIdController,
  listUsersController,
  removeMemberProfilePhotoController,
  uploadMemberProfilePhotoController,
} from "../controllers/admin.controller.js";
import { verifyToken } from "../middlewares/jwt.middleware.js";
import { authorizeRoles } from "../middlewares/authorization.middleware.js";
import { verifyOwnership } from "../middlewares/ownership.middleware.js";
import { receiveProfilePhoto } from "../middlewares/profile-photo-upload.middleware.js";
const router = Router();

router.post("/login", validateRequest(loginSchema), loginController);
router.post(
  "/login/token",
  validateRequest(loginSchema),
  jwtLoginController,
);
router.post(
  "/login/token-cookie",
  validateRequest(loginSchema),
  jwtCookieLoginController,
);
router.post("/logout/token-cookie", jwtCookieLogoutController);

router.get(
  "/",
  authenticate,
  requireAdmin,
  validateRequest(userSearchQuerySchema, "query"),
  listUsersController,
);
router.post(
  "/",
  authenticate,
  requireAdmin,
  validateRequest(createUserSchema),
  createUserController,
);
router.put(
  "/:id/photo",
  authenticate,
  requireAdmin,
  validateRequest(memberPhotoParamsSchema, "params"),
  receiveProfilePhoto,
  uploadMemberProfilePhotoController,
);
router.delete(
  "/:id/photo",
  authenticate,
  requireAdmin,
  validateRequest(memberPhotoParamsSchema, "params"),
  removeMemberProfilePhotoController,
);

router.get("/profile", authenticate, profileController);

router.post(
  "/change-password",
  authenticate,
  validateRequest(changePasswordSchema),
  changePasswordController,
);

router.post("/logout", authenticate, logoutController);

router.get("/jwt/profile", verifyToken, (req, res) => {
  res.json({ success: true, data: req.user });
});
router.get(
  "/jwt/users/:id",
  verifyToken,
  validateRequest(userIdParamsSchema, "params"),
  verifyOwnership(),
  getUserByIdController,
);
router.get(
  "/jwt/admin/users",
  verifyToken,
  authorizeRoles("admin"),
  listUsersController,
);
router.get(
  "/:id",
  authenticate,
  requireAdmin,
  validateRequest(memberPhotoParamsSchema, "params"),
  getMemberDetailsController,
);

export default router;