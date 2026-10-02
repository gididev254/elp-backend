// Messages controller — list / send / get / delete / mark-read / recipients.

import type { Request, Response } from "express";
import {
  listMessages,
  sendMessage,
  getMessage,
  deleteMessage,
  markMessageRead,
  listRecipients,
} from "../services/messages.service";
import { ok, fail } from "../utils/response";

function clientIp(req: Request): string | undefined {
  return req.headers["x-forwarded-for"]?.toString();
}

export async function listMessagesController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const box = req.query.box === "sent" ? "sent" : "inbox";
  const result = await listMessages(box, req.user);
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function sendMessageController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await sendMessage(req.body, req.user, clientIp(req));
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function getMessageController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await getMessage(req.params.id, req.user);
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function deleteMessageController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await deleteMessage(req.params.id, req.user, clientIp(req));
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function markMessageReadController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await markMessageRead(req.params.id, req.user);
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function listRecipientsController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await listRecipients(req.user);
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}
