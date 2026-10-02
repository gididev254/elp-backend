// Leaders routes — /api/leaders/*
//   GET  /               — list leaders (with cohort scope enforced in service)
//   GET  /:id            — fetch a single leader
//   PATCH /:id           — authorized profile update (non-read-only roles)
//   POST  /:id/archive   — soft delete (status → deactivated)
//
// Permission gating:
//   - admins / executives with leaders.view → all leaders
//   - Male Y1 Rep   → male year-1 cohort only
//   - Female Y1 Rep → female year-1 cohort only
//   - Asst Female Y1 Rep → female year-1, read-only
//   - Plain Leader (no leaders.view*) → only self

import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { leaderIdParamSchema, updateLeaderSchema } from "../validators/leader.validator";
import {
  listLeadersController,
  getLeaderController,
  updateLeaderController,
  archiveLeaderController,
  exportLeadersCsvController,
} from "../controllers/leaders.controller";

const router = Router();

router.get("/", authenticate, listLeadersController);
router.get(
  "/:id",
  authenticate,
  validate({ params: leaderIdParamSchema }),
  getLeaderController,
);
router.patch(
  "/:id",
  authenticate,
  validate({ params: leaderIdParamSchema, body: updateLeaderSchema }),
  updateLeaderController,
);
router.post(
  "/:id/archive",
  authenticate,
  validate({ params: leaderIdParamSchema }),
  archiveLeaderController,
);
router.post("/export", authenticate, exportLeadersCsvController);

export default router;
