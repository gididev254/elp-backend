// Attendance routes — /api/attendance/*
//   GET  /event/:eventId  — list attendance for an event
//   POST /                — record attendance for a member
//
// Permission gating:
//   - admins / OrgSec with attendance.manage → everyone
//   - Male Y1 Rep → male year-1 cohort only (service-layer enforced)
//   - Female Y1 Rep → female year-1 cohort only
//   - Asst Female Y1 Rep → view-only (no POST)

import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { requireAnyPermission } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import {
  listEventAttendanceController,
  recordAttendanceController,
  recordAttendanceBulkController,
} from "../controllers/attendance.controller";

const eventParamSchema = z.object({ eventId: z.string().min(1) });

const recordSchema = z.object({
  eventId: z.string().min(1),
  userId: z.string().min(1),
  status: z.enum(["present", "absent", "late", "excused"]),
  note: z.string().max(2000).optional(),
});

const bulkSchema = z.object({
  eventId: z.string().min(1),
  records: z.array(
    z.object({
      userId: z.string().min(1),
      status: z.enum(["present", "absent", "late", "excused"]),
      note: z.string().max(2000).optional(),
    }),
  ),
});

const router = Router();

router.get(
  "/event/:eventId",
  authenticate,
  requireAnyPermission(
    "attendance.view",
    "attendance.manage",
    "attendance.manage.male_y1",
    "attendance.manage.female_y1",
    "attendance.view.female_y1",
    "admin.system",
  ),
  validate({ params: eventParamSchema }),
  listEventAttendanceController,
);

router.post(
  "/",
  authenticate,
  requireAnyPermission(
    "attendance.manage",
    "attendance.manage.male_y1",
    "attendance.manage.female_y1",
    "admin.system",
  ),
  validate({ body: recordSchema }),
  recordAttendanceController,
);

// Bulk save — used by the attendance-manager "Save" button.
router.post(
  "/bulk",
  authenticate,
  requireAnyPermission(
    "attendance.manage",
    "attendance.manage.male_y1",
    "attendance.manage.female_y1",
    "admin.system",
  ),
  validate({ body: bulkSchema }),
  recordAttendanceBulkController,
);

export default router;
