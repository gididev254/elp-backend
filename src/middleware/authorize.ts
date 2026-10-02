// Authorization middleware factories.
// `requirePermission(perm)` and `requireAnyPermission(...perms)` check the
// authenticated user's permission set. Must run AFTER `authenticate`.

import type { NextFunction, Request, Response } from "express";
import type { ResolvedUser } from "../types/auth";
import { hasPermission, hasAnyPermission } from "../services/auth.service";
import { forbidden, unauthorized } from "../utils/response";

// Helper: pull the resolved user off the request, 401 if missing.
function getUser(req: Request, res: Response): ResolvedUser | null {
  if (!req.user) {
    unauthorized(res, "Authentication required.");
    return null;
  }
  return req.user;
}

export function requirePermission(perm: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = getUser(req, res);
    if (!user) return;
    if (!hasPermission(user, perm)) {
      forbidden(res, "You do not have permission to perform this action.");
      return;
    }
    next();
  };
}

export function requireAnyPermission(...perms: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = getUser(req, res);
    if (!user) return;
    if (!hasAnyPermission(user, ...perms)) {
      forbidden(res, "You do not have permission to perform this action.");
      return;
    }
    next();
  };
}

// requireAllPermissions — every listed permission must be present.
export function requireAllPermissions(...perms: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = getUser(req, res);
    if (!user) return;
    if (!user.permissions.has("admin.system")) {
      const hasAll = perms.every((p) => user.permissions.has(p));
      if (!hasAll) {
        forbidden(res, "You do not have permission to perform this action.");
        return;
      }
    }
    next();
  };
}
