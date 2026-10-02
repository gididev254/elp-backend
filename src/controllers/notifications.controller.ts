// Notifications controller — list own + mark one / all as read.

import type { Request, Response } from "express";
import {
  listNotifications,
  markNotificationRead,
  markAllRead,
} from "../services/notifications.service";
import { ok, fail } from "../utils/response";

export async function listNotificationsController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const result = await listNotifications(req.user);
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}

export async function markNotificationReadController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const result = await markNotificationRead(req.params.id, req.user);
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}

export async function markAllReadController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const result = await markAllRead(req.user);
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}
