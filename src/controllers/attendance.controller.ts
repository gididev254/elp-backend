// Attendance controller — list for an event + record a member's status.

import type { Request, Response } from "express";
import {
  listEventAttendance,
  recordAttendance,
  recordAttendanceBulk,
} from "../services/attendance.service";
import { ok, fail } from "../utils/response";

export async function listEventAttendanceController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const result = await listEventAttendance(req.params.eventId, req.user);
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}

export async function recordAttendanceController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const ip = req.headers["x-forwarded-for"]?.toString();
  const result = await recordAttendance(
    {
      eventId: req.body.eventId,
      userId: req.body.userId,
      status: req.body.status,
      note: req.body.note,
    },
    req.user,
    ip,
  );
  if (!result.ok) {
    fail(res, result.error, result.status, result.details);
    return;
  }
  ok(res, result.data, result.status);
}

export async function recordAttendanceBulkController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const ip = req.headers["x-forwarded-for"]?.toString();
  const result = await recordAttendanceBulk(
    { eventId: req.body.eventId, records: req.body.records },
    req.user,
    ip,
  );
  if (!result.ok) {
    fail(res, result.error, result.status, result.details);
    return;
  }
  ok(res, result.data, result.status);
}