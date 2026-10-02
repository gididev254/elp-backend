// Reports controller — overview (role-scoped) + CSV export.

import type { Request, Response } from "express";
import {
  buildReportOverview,
  exportReport,
  type ExportType,
} from "../services/reports.service";
import { ok, fail } from "../utils/response";

const ALLOWED_EXPORT_TYPES: ExportType[] = [
  "leaders",
  "events",
  "finance",
  "attendance",
  "mentorship",
  "alumni",
];

export async function getReportOverviewController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await buildReportOverview(req.user);
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function exportReportController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const type = (req.query.type as string | undefined)?.trim().toLowerCase() as ExportType;
  if (!ALLOWED_EXPORT_TYPES.includes(type)) {
    fail(
      res,
      `Invalid type. Allowed: ${ALLOWED_EXPORT_TYPES.join(", ")}`,
      400,
    );
    return;
  }

  const result = await exportReport(type, req.user);
  if (!result.ok) { fail(res, result.error, result.status); return; }

  // CSV download — bypasses the JSON envelope.
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${result.data.filename}"`,
  );
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(result.data.csv);
}
