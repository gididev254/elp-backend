// Alumni controller — thin handlers that delegate to the service.

import type { Request, Response } from "express";
import {
  listAlumni,
  createAlumni,
  getAlumni,
  updateAlumni,
  archiveAlumni,
} from "../services/alumni.service";
import { ok, fail } from "../utils/response";

function clientIp(req: Request): string | undefined {
  return req.headers["x-forwarded-for"]?.toString();
}

export async function listAlumniController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const result = await listAlumni(
    {
      engagementLevel: req.query.engagementLevel as string | undefined,
      graduationYear: req.query.graduationYear
        ? Number(req.query.graduationYear)
        : undefined,
      search: req.query.search as string | undefined,
      status: req.query.status as string | undefined,
    },
    req.user,
  );
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}

export async function createAlumniController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const result = await createAlumni(req.body, req.user, clientIp(req));
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}

export async function getAlumniController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const result = await getAlumni(req.params.id);
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}

export async function updateAlumniController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const result = await updateAlumni(req.params.id, req.body, req.user, clientIp(req));
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}

export async function archiveAlumniController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const result = await archiveAlumni(req.params.id, req.user, clientIp(req));
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}
