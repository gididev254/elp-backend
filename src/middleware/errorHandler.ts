// Centralized error handler — last-resort catch for uncaught errors
// thrown synchronously or rejected asynchronously in route handlers.
// Renders the standard `{ error }` envelope.

import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../utils/logger";
import { fail } from "../utils/response";

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  // next is required by Express's error-handler signature even if unused.
  _next: NextFunction,
) => {
  if (err instanceof ZodError) {
    fail(res, err.issues[0]?.message ?? "Validation error.", 422, err.issues);
    return;
  }

  if (err instanceof Error) {
    // Prisma errors carry a `code` (P2002 = unique constraint, etc.)
    const anyErr = err as Error & { code?: string };
    if (anyErr.code === "P2002") {
      fail(res, "A record with this value already exists.", 409);
      return;
    }
    if (anyErr.code === "P2025") {
      fail(res, "Record not found.", 404);
      return;
    }
    logger.error("error-handler", err.message, {
      stack: err.stack,
      path: req.path,
      method: req.method,
      code: anyErr.code,
    });
    if (process.env.NODE_ENV === "production") {
      fail(res, "Internal server error.", 500);
    } else {
      fail(res, err.message || "Internal server error.", 500);
    }
    return;
  }

  logger.error("error-handler", "Unknown error", err);
  fail(res, "Internal server error.", 500);
};
