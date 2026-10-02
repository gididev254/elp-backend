// Authentication middleware.
// Extracts a Bearer token from the Authorization header, verifies the JWT,
// resolves the user (with permissions) from the DB and attaches it to
// `req.user`. Returns 401 if no token, token is invalid, or the user no
// longer exists.

import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt";
import { resolveUser } from "../services/auth.service";
import { unauthorized, forbidden } from "../utils/response";

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) {
    unauthorized(res, "Authentication required.");
    return;
  }
  const token = header.slice(7).trim();
  if (!token) {
    unauthorized(res, "Authentication required.");
    return;
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    unauthorized(res, "Invalid or expired token.");
    return;
  }

  const user = await resolveUser(payload.sub);
  if (!user) {
    unauthorized(res, "User no longer exists.");
    return;
  }

  if (user.status !== "active") {
    forbidden(res, `Account not active (status: ${user.status}).`);
    return;
  }

  req.user = user;
  next();
}

// Optional auth — attaches req.user if a valid token is present, but does
// not 401 if absent. Useful for public endpoints that adapt to logged-in
// users (e.g. showing "registered" state on a public event detail page).
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization ?? "";
  if (header.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim();
    if (token) {
      try {
        const payload = verifyToken(token);
        const user = await resolveUser(payload.sub);
        if (user && user.status === "active") req.user = user;
      } catch {
        // ignore — leave req.user undefined
      }
    }
  }
  next();
}
