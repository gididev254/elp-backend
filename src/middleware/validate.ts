// Zod validation middleware factory.
// Usage:
//   validate({ body: LoginSchema })
//   validate({ body: CreateSchema, params: IdParamsSchema, query: ListQuerySchema })
//
// On validation failure, returns 422 with `{ error, details }` — the same
// envelope shape used by the frontend.

import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { validationError } from "../utils/response";

export interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (schemas.params) {
      const parsed = schemas.params.safeParse(req.params);
      if (!parsed.success) {
        validationError(
          res,
          parsed.error.issues[0]?.message ?? "Invalid URL parameters.",
          parsed.error.issues,
        );
        return;
      }
      req.params = parsed.data as Record<string, string>;
    }

    if (schemas.query) {
      const parsed = schemas.query.safeParse(req.query);
      if (!parsed.success) {
        validationError(
          res,
          parsed.error.issues[0]?.message ?? "Invalid query parameters.",
          parsed.error.issues,
        );
        return;
      }
      // Attach the parsed query to req.query as the typed shape.
      (req as Request & { query: unknown }).query = parsed.data;
    }

    if (schemas.body) {
      const parsed = schemas.body.safeParse(req.body);
      if (!parsed.success) {
        validationError(
          res,
          parsed.error.issues[0]?.message ?? "Invalid request body.",
          parsed.error.issues,
        );
        return;
      }
      req.body = parsed.data;
    }

    next();
  };
}
