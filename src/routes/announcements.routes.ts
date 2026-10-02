// Announcements routes — /api/announcements/*
//   GET   /      — list (announcements.view OR announcements.manage)
//   POST  /      — create (announcements.manage)
//   GET   /:id   — fetch one
//   PATCH /:id   — update (announcements.manage)

import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { requirePermission, requireAnyPermission } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { AUDIENCES } from "../services/announcements.service";
import {
  listAnnouncementsController,
  getAnnouncementController,
  createAnnouncementController,
  updateAnnouncementController,
} from "../controllers/announcements.controller";

const idParamSchema = z.object({ id: z.string().min(1) });

const createSchema = z.object({
  title: z.string().min(3).max(200),
  body: z.string().min(5).max(20000),
  audience: z.enum(AUDIENCES).optional(),
  status: z.enum(["draft", "published"]).optional(),
});

const patchSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  body: z.string().min(5).max(20000).optional(),
  audience: z.enum(AUDIENCES).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

const router = Router();

router.get(
  "/",
  authenticate,
  requireAnyPermission("announcements.view", "announcements.manage"),
  listAnnouncementsController,
);

router.post(
  "/",
  authenticate,
  requirePermission("announcements.manage"),
  validate({ body: createSchema }),
  createAnnouncementController,
);

router.get(
  "/:id",
  authenticate,
  requireAnyPermission("announcements.view", "announcements.manage"),
  validate({ params: idParamSchema }),
  getAnnouncementController,
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("announcements.manage"),
  validate({ params: idParamSchema, body: patchSchema }),
  updateAnnouncementController,
);

export default router;
