// Programs controller — list/get/create/update/archive/publish.

import type { Request, Response } from "express";
import {
  listPrograms,
  getProgram,
  createProgram,
  updateProgram,
  archiveProgram,
  publishProgram,
} from "../services/programs.service";
import { ok, fail } from "../utils/response";

export async function listProgramsController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const result = await listPrograms(
    {
      status: req.query.status as string | undefined,
      category: req.query.category as string | undefined,
      search: req.query.search as string | undefined,
    },
    req.user,
  );
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}

export async function getProgramController(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await getProgram(req.params.id);
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}

export async function createProgramController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const ip = req.headers["x-forwarded-for"]?.toString();
  const result = await createProgram(req.body, req.user, ip);
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}

export async function updateProgramController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const ip = req.headers["x-forwarded-for"]?.toString();
  const result = await updateProgram(req.params.id, req.body, req.user, ip);
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}

export async function archiveProgramController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const ip = req.headers["x-forwarded-for"]?.toString();
  const result = await archiveProgram(req.params.id, req.user, ip);
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}

export async function publishProgramController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const ip = req.headers["x-forwarded-for"]?.toString();
  const result = await publishProgram(req.params.id, req.user, ip);
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}
