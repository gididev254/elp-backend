// 404 handler — fired when no route matches.

import type { Request, Response } from "express";
import { notFound } from "../utils/response";

export function notFoundHandler(req: Request, res: Response): void {
  notFound(res, `Route not found: ${req.method} ${req.originalUrl}`);
}
