// Leaders controller — list + detail + authorized updates.
// Cohort scope is enforced at the service layer (Prisma `where` clause).

import type { Request, Response } from "express";
import {
  listLeaders,
  getLeader,
  updateLeader,
  archiveLeader,
  exportLeadersCsv,
} from "../services/leaders.service";
import { ok, fail } from "../utils/response";

export async function listLeadersController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const result = await listLeaders(
    {
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      search: req.query.search as string | undefined,
      year: req.query.year ? Number(req.query.year) : undefined,
      school: req.query.school as string | undefined,
      gender: req.query.gender as string | undefined,
    },
    req.user,
  );
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}

export async function getLeaderController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const result = await getLeader(req.params.id, req.user);
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}

// PATCH /api/leaders/:id — authorized profile update.
export async function updateLeaderController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const ip = req.headers["x-forwarded-for"]?.toString();
  const result = await updateLeader(req.params.id, req.body, req.user, ip);
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}

// POST /api/leaders/:id/archive — soft delete (status → deactivated).
export async function archiveLeaderController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const ip = req.headers["x-forwarded-for"]?.toString();
  const result = await archiveLeader(req.params.id, req.user, ip);
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}

// POST /api/leaders/export — CSV download (role-scoped).
export async function exportLeadersCsvController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const result = await exportLeadersCsv(req.user);
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${result.data.filename}"`,
  );
  res.setHeader("Cache-Control", "no-store");
  res.send(result.data.csv);
}
