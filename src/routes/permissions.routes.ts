// Permissions routes — /api/permissions/*
//   GET / — list all permissions in the catalogue.

import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { listPermissionsController } from "../controllers/permissions.controller";

const router = Router();

router.get("/", authenticate, listPermissionsController);

export default router;
