// Roles controller — list all roles + get a role with its permissions.

import type { Request, Response } from "express";
import { listRoles, getRole } from "../services/roles.service";
import { ok, fail } from "../utils/response";

export async function listRolesController(
  _req: Request,
  res: Response,
): Promise<void> {
  const result = await listRoles();
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}

export async function getRoleController(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await getRole(req.params.id);
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}
