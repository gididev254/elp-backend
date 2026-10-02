// Search controller — cross-module search.

import type { Request, Response } from "express";
import { searchAll } from "../services/search.service";
import { ok, fail } from "../utils/response";

export async function searchController(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const q = (req.query.q as string | undefined)?.trim() ?? "";
  const result = await searchAll(q, req.user);
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}
