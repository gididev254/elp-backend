// Announcements controller — list/create/update.

import type { Request, Response } from "express";
import {
  listAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
} from "../services/announcements.service";
import { ok, fail } from "../utils/response";

export async function listAnnouncementsController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const result = await listAnnouncements(
    {
      status: req.query.status as string | undefined,
      audience: req.query.audience as string | undefined,
      search: req.query.search as string | undefined,
    },
    req.user,
  );
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}

export async function getAnnouncementController(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await getAnnouncement(req.params.id);
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}

export async function createAnnouncementController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const ip = req.headers["x-forwarded-for"]?.toString();
  const result = await createAnnouncement(req.body, req.user, ip);
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}

export async function updateAnnouncementController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const ip = req.headers["x-forwarded-for"]?.toString();
  const result = await updateAnnouncement(req.params.id, req.body, req.user, ip);
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}
