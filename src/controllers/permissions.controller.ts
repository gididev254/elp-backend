// Permissions controller — list all permissions in the catalogue.

import type { Request, Response } from "express";
import { listPermissions } from "../services/roles.service";
import { ok, fail } from "../utils/response";

export async function listPermissionsController(
  _req: Request,
  res: Response,
): Promise<void> {
  const result = await listPermissions();
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}
