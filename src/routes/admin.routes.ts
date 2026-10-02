// Admin routes — /api/admin/*
//   GET    /users                 — list users (admin.users)
//   POST   /users/:id/approve     — set status=active (admin.users)
//   POST   /users/:id/reject      — deactivate pending registration (admin.users)
//   PATCH  /users/:id/status      — change status (admin.users)
//   GET    /users/:id/roles       — list user's role assignments (admin.users)
//   POST   /users/:id/roles       — assign a role (admin.users)
//   DELETE /users/:id/roles       — remove a role (?roleKey=KEY) (admin.users)
//
// This is a parallel mount to /api/users/* — admin routes expose the full
// executive surface (approve / reject / status / roles) in one place.

import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requirePermission } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { idParamSchema } from "../validators/shared.validator";
import {
  adminListUsersQuerySchema,
  assignRoleSchema,
} from "../validators/admin.validator";
import { userStatusSchema } from "../validators/user.validator";
import {
  listUsersController,
  approveUserController,
  rejectUserController,
  updateUserStatusController,
  listUserRolesController,
  assignRoleController,
  removeRoleController,
} from "../controllers/admin.controller";

const router = Router();

const adminGate = [authenticate, requirePermission("admin.users")] as const;

router.get(
  "/users",
  ...adminGate,
  validate({ query: adminListUsersQuerySchema }),
  listUsersController,
);

router.post(
  "/users/:id/approve",
  ...adminGate,
  validate({ params: idParamSchema }),
  approveUserController,
);

router.post(
  "/users/:id/reject",
  ...adminGate,
  validate({ params: idParamSchema }),
  rejectUserController,
);

router.patch(
  "/users/:id/status",
  ...adminGate,
  validate({ params: idParamSchema, body: userStatusSchema }),
  updateUserStatusController,
);

router.get(
  "/users/:id/roles",
  ...adminGate,
  validate({ params: idParamSchema }),
  listUserRolesController,
);

router.post(
  "/users/:id/roles",
  ...adminGate,
  validate({ params: idParamSchema, body: assignRoleSchema }),
  assignRoleController,
);

router.delete(
  "/users/:id/roles",
  ...adminGate,
  validate({ params: idParamSchema }),
  removeRoleController,
);

export default router;
