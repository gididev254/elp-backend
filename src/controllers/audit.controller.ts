// Audit log controller — read-only list endpoint.

import type { Request, Response } from "express";
import { listAudit } from "../services/audit.service";
import { ok, fail } from "../utils/response";

export async function listAuditController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const page = req.query.page ? Number(req.query.page) : undefined;
  const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
  const result = await listAudit({
    action: req.query.action as string | undefined,
    actorId: req.query.actorId as string | undefined,
    search: req.query.search as string | undefined,
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
    page,
    pageSize,
  });
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}
