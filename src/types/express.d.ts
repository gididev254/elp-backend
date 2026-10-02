// Express Request augmentation — adds the resolved authenticated user.

import type { Request } from "express";
import type { ResolvedUser } from "./auth";

// We attach a fully-resolved user (with permissions) to the request after
// the `authenticate` middleware runs. Downstream middleware (e.g. `authorize`)
// and controllers read it from `req.user`.
declare module "express-serve-static-core" {
  interface Request {
    user?: ResolvedUser;
  }
}

export type AuthedRequest = Request & { user: ResolvedUser };
