// Mentorship routes — /api/mentorship/*
//   GET    /                  — list assignments (mentorship.view OR mentorship.manage)
//   POST   /                  — create assignment (mentorship.manage)
//   GET    /sessions          — flat list of all sessions across assignments
//   PATCH  /sessions/:id      — update a session (mentorship.manage)
//   DELETE /sessions/:id      — hard delete a session (mentorship.manage)
//   GET    /:id               — fetch single assignment (with sessions)
//   PATCH  /:id               — update assignment (mentorship.manage)
//   DELETE /:id               — cancel assignment (soft delete, mentorship.manage)
//   GET    /:id/sessions      — list sessions for an assignment
//   POST   /:id/sessions      — create session for an assignment (mentorship.manage)
//
// Note: `/sessions` literal paths are mounted BEFORE `/:id` so Express doesn't
// treat "sessions" as an assignment ID.

import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requireAnyPermission, requirePermission } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { idParamSchema } from "../validators/shared.validator";
import {
  createAssignmentSchema,
  createSessionSchema,
  listAssignmentsQuerySchema,
  listSessionsQuerySchema,
  patchAssignmentSchema,
  patchSessionSchema,
} from "../validators/mentorship.validator";
import {
  listAssignmentsController,
  createAssignmentController,
  getAssignmentController,
  updateAssignmentController,
  cancelAssignmentController,
  listSessionsController,
  listAssignmentSessionsController,
  createSessionController,
  updateSessionController,
  deleteSessionController,
} from "../controllers/mentorship.controller";

const router = Router();

const viewOrManage = [requireAnyPermission("mentorship.view", "mentorship.manage")];

// Flat sessions list (across all assignments) — must be mounted before /:id.
router.get(
  "/sessions",
  authenticate,
  ...viewOrManage,
  validate({ query: listSessionsQuerySchema }),
  listSessionsController,
);
router.patch(
  "/sessions/:id",
  authenticate,
  requirePermission("mentorship.manage"),
  validate({ params: idParamSchema, body: patchSessionSchema }),
  updateSessionController,
);
router.delete(
  "/sessions/:id",
  authenticate,
  requirePermission("mentorship.manage"),
  validate({ params: idParamSchema }),
  deleteSessionController,
);

// Assignments.
router.get(
  "/",
  authenticate,
  ...viewOrManage,
  validate({ query: listAssignmentsQuerySchema }),
  listAssignmentsController,
);
router.post(
  "/",
  authenticate,
  requirePermission("mentorship.manage"),
  validate({ body: createAssignmentSchema }),
  createAssignmentController,
);
router.get(
  "/:id",
  authenticate,
  ...viewOrManage,
  validate({ params: idParamSchema }),
  getAssignmentController,
);
router.patch(
  "/:id",
  authenticate,
  requirePermission("mentorship.manage"),
  validate({ params: idParamSchema, body: patchAssignmentSchema }),
  updateAssignmentController,
);
router.delete(
  "/:id",
  authenticate,
  requirePermission("mentorship.manage"),
  validate({ params: idParamSchema }),
  cancelAssignmentController,
);

// Sessions scoped to a single assignment.
router.get(
  "/:id/sessions",
  authenticate,
  ...viewOrManage,
  validate({ params: idParamSchema }),
  listAssignmentSessionsController,
);
router.post(
  "/:id/sessions",
  authenticate,
  requirePermission("mentorship.manage"),
  validate({ params: idParamSchema, body: createSessionSchema }),
  createSessionController,
);

export default router;
