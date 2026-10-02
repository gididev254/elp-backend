// Concerns routes — /api/concerns/*
//   GET   /              — list concerns (auth; cohort reps see own, execs see all)
//   POST  /              — submit a new concern (Year-1 Reps only)
//   PATCH /:id/status    — change concern status (concerns.manage)

import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requirePermission } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { idParamSchema } from "../validators/shared.validator";
import {
  createConcernSchema,
  updateConcernStatusSchema,
} from "../validators/concerns.validator";
import {
  listConcernsController,
  createConcernController,
  updateConcernStatusController,
} from "../controllers/concerns.controller";

const router = Router();

router.get("/", authenticate, listConcernsController);
router.post(
  "/",
  authenticate,
  validate({ body: createConcernSchema }),
  createConcernController,
);
router.patch(
  "/:id/status",
  authenticate,
  requirePermission("concerns.manage"),
  validate({ params: idParamSchema, body: updateConcernStatusSchema }),
  updateConcernStatusController,
);

export default router;
