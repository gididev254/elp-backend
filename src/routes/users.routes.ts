// Users admin routes — /api/users/*
//   GET   /              — list users (admin.users)
//   POST  /:id/approve   — set status=active (admin.users)
//   PATCH /:id/status    — change status (admin.users)
//   PATCH /me/password   — self-service password change (authenticated)

import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requirePermission } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import {
  userIdParamSchema,
  userStatusSchema,
  changePasswordSchema,
} from "../validators/user.validator";
import {
  listUsersController,
  approveUserController,
  updateUserStatusController,
  changeOwnPasswordController,
} from "../controllers/users.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("admin.users"),
  listUsersController,
);

router.post(
  "/:id/approve",
  authenticate,
  requirePermission("admin.users"),
  validate({ params: userIdParamSchema }),
  approveUserController,
);

router.patch(
  "/:id/status",
  authenticate,
  requirePermission("admin.users"),
  validate({ params: userIdParamSchema, body: userStatusSchema }),
  updateUserStatusController,
);

// Self-service password change — any authenticated active user.
router.patch(
  "/me/password",
  authenticate,
  validate({ body: changePasswordSchema }),
  changeOwnPasswordController,
);

export default router;
