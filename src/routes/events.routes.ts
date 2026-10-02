// Events routes — /api/events/*
//   GET   /              — list (events.view OR events.manage)
//   POST  /              — create (events.manage)
//   GET   /:id           — fetch one (events.view OR events.manage)
//   PATCH /:id           — update (events.manage)
//   POST  /:id/register  — self-register (any authenticated active user)

import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requirePermission, requireAnyPermission } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import {
  eventIdParamSchema,
  createEventSchema,
  patchEventSchema,
} from "../validators/event.validator";
import {
  listEventsController,
  getEventController,
  createEventController,
  updateEventController,
  registerForEventController,
} from "../controllers/events.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  requireAnyPermission("events.view", "events.manage"),
  listEventsController,
);

router.post(
  "/",
  authenticate,
  requirePermission("events.manage"),
  validate({ body: createEventSchema }),
  createEventController,
);

router.get(
  "/:id",
  authenticate,
  requireAnyPermission("events.view", "events.manage"),
  validate({ params: eventIdParamSchema }),
  getEventController,
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("events.manage"),
  validate({ params: eventIdParamSchema, body: patchEventSchema }),
  updateEventController,
);

router.post(
  "/:id/register",
  authenticate,
  validate({ params: eventIdParamSchema }),
  registerForEventController,
);

export default router;
