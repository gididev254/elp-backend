// Alumni routes — /api/alumni/*
//   GET    /          — list alumni (alumni.view OR alumni.manage)
//   POST   /          — create alumni record (alumni.manage)
//   GET    /:id       — fetch single alumni
//   PATCH  /:id       — update alumni record (alumni.manage)
//   DELETE /:id       — archive alumni record (soft delete, alumni.manage)

import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requireAnyPermission, requirePermission } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { idParamSchema } from "../validators/shared.validator";
import {
  createAlumniSchema,
  listAlumniQuerySchema,
  patchAlumniSchema,
} from "../validators/alumni.validator";
import {
  listAlumniController,
  createAlumniController,
  getAlumniController,
  updateAlumniController,
  archiveAlumniController,
} from "../controllers/alumni.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  requireAnyPermission("alumni.view", "alumni.manage"),
  validate({ query: listAlumniQuerySchema }),
  listAlumniController,
);

router.post(
  "/",
  authenticate,
  requirePermission("alumni.manage"),
  validate({ body: createAlumniSchema }),
  createAlumniController,
);

router.get(
  "/:id",
  authenticate,
  requireAnyPermission("alumni.view", "alumni.manage"),
  validate({ params: idParamSchema }),
  getAlumniController,
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("alumni.manage"),
  validate({ params: idParamSchema, body: patchAlumniSchema }),
  updateAlumniController,
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("alumni.manage"),
  validate({ params: idParamSchema }),
  archiveAlumniController,
);

export default router;
