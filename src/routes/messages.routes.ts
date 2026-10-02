// Messages routes — /api/messages/*
//   GET    /                — list messages (?box=inbox|sent)
//   POST   /                — send a new message
//   GET    /recipients      — list users the current user can message
//   GET    /:id             — fetch a single message (sender or recipient only)
//   DELETE /:id             — delete a message (hard delete; either party)
//   POST   /:id/read        — mark a message as read (recipient only)
//
// Note: `/recipients` literal path is mounted BEFORE `/:id`.

import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { idParamSchema } from "../validators/shared.validator";
import { listMessagesQuerySchema, sendMessageSchema } from "../validators/messages.validator";
import {
  listMessagesController,
  sendMessageController,
  getMessageController,
  deleteMessageController,
  markMessageReadController,
  listRecipientsController,
} from "../controllers/messages.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  validate({ query: listMessagesQuerySchema }),
  listMessagesController,
);
router.post(
  "/",
  authenticate,
  validate({ body: sendMessageSchema }),
  sendMessageController,
);
router.get("/recipients", authenticate, listRecipientsController);
router.get(
  "/:id",
  authenticate,
  validate({ params: idParamSchema }),
  getMessageController,
);
router.delete(
  "/:id",
  authenticate,
  validate({ params: idParamSchema }),
  deleteMessageController,
);
router.post(
  "/:id/read",
  authenticate,
  validate({ params: idParamSchema }),
  markMessageReadController,
);

export default router;
