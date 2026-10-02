// Admin controller — user administration (list/approve/reject/status + roles).

import type { Request, Response } from "express";
import {
  listUsers,
  approveUser,
  rejectUser,
  updateUserStatus,
  listUserRoles,
  assignRole,
  removeRole,
} from "../services/admin.service";
import { ok, fail } from "../utils/response";

function clientIp(req: Request): string | undefined {
  return req.headers["x-forwarded-for"]?.toString();
}

export async function listUsersController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await listUsers({
    status: req.query.status as string | undefined,
    take: req.query.take ? Number(req.query.take) : undefined,
    search: req.query.search as string | undefined,
  });
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function approveUserController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await approveUser(req.params.id, req.user, clientIp(req));
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function rejectUserController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await rejectUser(req.params.id, req.user, clientIp(req));
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function updateUserStatusController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await updateUserStatus(
    req.params.id,
    req.body.status,
    req.user,
    clientIp(req),
  );
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function listUserRolesController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await listUserRoles(req.params.id);
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function assignRoleController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await assignRole(req.params.id, req.body.roleKey, req.user, clientIp(req));
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function removeRoleController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const roleKey = req.query.roleKey as string | undefined;
  if (!roleKey) {
    fail(res, "Missing required query parameter: roleKey.", 422);
    return;
  }
  const result = await removeRole(req.params.id, roleKey, req.user, clientIp(req));
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}
