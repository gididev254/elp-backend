// Programs routes — /api/programs/*
//   GET    /             — list (programs.view OR programs.manage)
//   POST   /             — create (programs.manage)
//   GET    /:id          — fetch one (programs.view OR programs.manage)
//   PATCH  /:id          — update (programs.manage)
//   DELETE /:id          — archive (soft delete, programs.manage)
//   POST   /:id/publish  — set status=published (programs.manage)

import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requirePermission, requireAnyPermission } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import {
  programIdParamSchema,
  createProgramSchema,
  patchProgramSchema,
} from "../validators/program.validator";
import {
  listProgramsController,
  getProgramController,
  createProgramController,
  updateProgramController,
  archiveProgramController,
  publishProgramController,
} from "../controllers/programs.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  requireAnyPermission("programs.view", "programs.manage"),
  listProgramsController,
);

router.post(
  "/",
  authenticate,
  requirePermission("programs.manage"),
  validate({ body: createProgramSchema }),
  createProgramController,
);

router.get(
  "/:id",
  authenticate,
  requireAnyPermission("programs.view", "programs.manage"),
  validate({ params: programIdParamSchema }),
  getProgramController,
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("programs.manage"),
  validate({ params: programIdParamSchema, body: patchProgramSchema }),
  updateProgramController,
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("programs.manage"),
  validate({ params: programIdParamSchema }),
  archiveProgramController,
);

router.post(
  "/:id/publish",
  authenticate,
  requirePermission("programs.manage"),
  validate({ params: programIdParamSchema }),
  publishProgramController,
);

export default router;
