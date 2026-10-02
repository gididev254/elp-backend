// Reports routes — /api/reports/*
//   GET /overview       — role-scoped report summary (reports.view)
//   GET /export?type=    — CSV download (reports.view)

import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requirePermission } from "../middleware/authorize";
import {
  getReportOverviewController,
  exportReportController,
} from "../controllers/reports.controller";

const router = Router();

router.get(
  "/overview",
  authenticate,
  requirePermission("reports.view"),
  getReportOverviewController,
);

router.get(
  "/export",
  authenticate,
  requirePermission("reports.view"),
  exportReportController,
);

export default router;
