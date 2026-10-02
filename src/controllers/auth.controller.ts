// Auth controller — POST /login, POST /register, GET /session.
// Translates service results into Express responses.

import type { Request, Response } from "express";
import { login, register, getSession } from "../services/auth.service";
import { recordAudit } from "../utils/logger";
import { ok, fail, serverError } from "../utils/response";

export async function loginController(req: Request, res: Response): Promise<void> {
  const result = await login(req.body);
  if (!result.ok) {
    fail(res, result.error, result.status, result.details);
    return;
  }
  ok(res, result.data, result.status);
}

export async function registerController(
  req: Request,
  res: Response,
): Promise<void> {
  const ip = req.headers["x-forwarded-for"]?.toString();
  const result = await register(req.body);
  if (!result.ok) {
    fail(res, result.error, result.status, result.details);
    return;
  }

  // Record an audit entry for the new (pending) account.
  if (result.data.userId) {
    await recordAudit({
      actorId: result.data.userId,
      action: "user.register",
      target: `user:${result.data.userId}`,
      context: { email: req.body.email, fullName: req.body.fullName },
      ip,
    });
  }

  ok(res, result.data, result.status);
}

export async function sessionController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const result = await getSession(req.user.id);
  if (!result.ok) {
    fail(res, result.error, result.status, result.details);
    return;
  }
  ok(res, result.data, result.status);
}

export function healthController(_req: Request, res: Response): void {
  ok(res, {
    status: "ok",
    service: "embuni-elc-backend",
    time: new Date().toISOString(),
  });
}

// Fallback for service-level throws that escape the typed ServiceResult.
export function handleError(res: Response, err: unknown): void {
  if (err instanceof Error) {
    serverError(res, err.message);
    return;
  }
  serverError(res);
}
