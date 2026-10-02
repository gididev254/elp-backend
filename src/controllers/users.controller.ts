// Users controller — admin endpoints + self-service password change.

import type { Request, Response } from "express";
import {
  listUsers,
  approveUser,
  updateUserStatus,
  changePassword,
} from "../services/users.service";
import { ok, fail } from "../utils/response";

export async function listUsersController(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await listUsers({
    status: req.query.status as string | undefined,
    take: req.query.take ? Number(req.query.take) : undefined,
    search: req.query.search as string | undefined,
  });
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}

export async function approveUserController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const ip = req.headers["x-forwarded-for"]?.toString();
  const result = await approveUser(req.params.id, req.user, ip);
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}

export async function updateUserStatusController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const ip = req.headers["x-forwarded-for"]?.toString();
  const result = await updateUserStatus(
    req.params.id,
    req.body.status,
    req.user,
    ip,
  );
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}

// PATCH /api/users/me/password — self-service password change.
export async function changeOwnPasswordController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const ip = req.headers["x-forwarded-for"]?.toString();
  const result = await changePassword(req.user.id, req.body, ip);
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}
