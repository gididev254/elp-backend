// Standardised API response helpers for Express.
// Mirrors the shape of the frontend's `lib/api-response.ts` so the API
// surface is identical between the Next.js sandbox and the production
// Express backend.

import type { Response } from "express";

export const API_ERRORS = {
  VALIDATION: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SERVER: 500,
} as const;

// 2xx — success
export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json(data);
}

// 4xx/5xx — failure with optional details
export function fail(
  res: Response,
  error: string,
  status = 400,
  details?: unknown,
) {
  return res.status(status).json({
    error,
    ...(details ? { details } : {}),
  });
}

export function notFound(res: Response, message = "Resource not found.") {
  return fail(res, message, API_ERRORS.NOT_FOUND);
}

export function forbidden(
  res: Response,
  message = "You do not have permission to perform this action.",
) {
  return fail(res, message, API_ERRORS.FORBIDDEN);
}

export function unauthorized(res: Response, message = "Authentication required.") {
  return fail(res, message, API_ERRORS.UNAUTHORIZED);
}

export function validationError(res: Response, message: string, details?: unknown) {
  return fail(res, message, API_ERRORS.VALIDATION, details);
}

export function conflict(res: Response, message: string) {
  return fail(res, message, API_ERRORS.CONFLICT);
}

export function serverError(res: Response, message = "Internal server error.") {
  return fail(res, message, API_ERRORS.SERVER);
}
