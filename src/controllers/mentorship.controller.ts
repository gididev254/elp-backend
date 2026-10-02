// Mentorship controller — assignments + sessions.

import type { Request, Response } from "express";
import {
  listAssignments,
  createAssignment,
  getAssignment,
  updateAssignment,
  cancelAssignment,
  listSessions,
  listAssignmentSessions,
  createSession,
  updateSession,
  deleteSession,
} from "../services/mentorship.service";
import { ok, fail } from "../utils/response";

function clientIp(req: Request): string | undefined {
  return req.headers["x-forwarded-for"]?.toString();
}

// Assignments
export async function listAssignmentsController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await listAssignments(
    {
      status: req.query.status as string | undefined,
      mentorId: req.query.mentorId as string | undefined,
      menteeId: req.query.menteeId as string | undefined,
    },
    req.user,
  );
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function createAssignmentController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await createAssignment(req.body, req.user, clientIp(req));
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function getAssignmentController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await getAssignment(req.params.id);
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function updateAssignmentController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await updateAssignment(req.params.id, req.body, req.user, clientIp(req));
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function cancelAssignmentController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await cancelAssignment(req.params.id, req.user, clientIp(req));
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

// Flat sessions list (across all assignments)
export async function listSessionsController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await listSessions(
    {
      mentorId: req.query.mentorId as string | undefined,
      menteeId: req.query.menteeId as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
    },
    req.user,
  );
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

// Sessions scoped to a single assignment
export async function listAssignmentSessionsController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await listAssignmentSessions(req.params.id);
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function createSessionController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await createSession(req.params.id, req.body, req.user, clientIp(req));
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function updateSessionController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await updateSession(req.params.id, req.body, req.user, clientIp(req));
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function deleteSessionController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await deleteSession(req.params.id, req.user, clientIp(req));
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}
