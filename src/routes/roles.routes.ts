// Roles routes — /api/roles/*
//   GET /       — list all roles in the catalogue
//   GET /:id    — fetch a role with its permissions (id OR role key)
//
// Read-only — any authenticated active user can browse the catalogue
// (since the same info is shipped to the frontend via the RBAC TS files).

import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { listRolesController, getRoleController } from "../controllers/roles.controller";

const router = Router();

router.get("/", authenticate, listRolesController);
router.get("/:id", authenticate, getRoleController);

export default router;
