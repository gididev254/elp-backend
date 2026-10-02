// Notifications routes — /api/notifications/*
//   GET  /             — list the current user's notifications
//   POST /:id/read     — mark one notification as read
//   POST /read-all     — mark all as read

import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import {
  listNotificationsController,
  markNotificationReadController,
  markAllReadController,
} from "../controllers/notifications.controller";

const idParamSchema = z.object({ id: z.string().min(1) });

const router = Router();

// NOTE: `/read-all` must be declared BEFORE `/:id/read` — otherwise Express
// would treat "read-all" as the `:id` parameter of the GET path. Both are
// POST routes with distinct paths so order is safe here, but keeping the
// literal path first is the safer convention.
router.post("/read-all", authenticate, markAllReadController);
router.post(
  "/:id/read",
  authenticate,
  validate({ params: idParamSchema }),
  markNotificationReadController,
);
router.get("/", authenticate, listNotificationsController);

export default router;
