// Audit routes — /api/audit/*
//   GET / — list audit log entries (audit.view)
//   Filters: ?action=, ?actorId=, ?search=, ?from=, ?to=, ?page=, ?pageSize=

import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requirePermission } from "../middleware/authorize";
import { listAuditController } from "../controllers/audit.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  requirePermission("audit.view"),
  listAuditController,
);

export default router;
