// Events controller — list/get/create/update/register.

import type { Request, Response } from "express";
import {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  registerForEvent,
} from "../services/events.service";
import { ok, fail } from "../utils/response";

export async function listEventsController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const result = await listEvents(
    {
      status: req.query.status as string | undefined,
      upcoming: req.query.upcoming === "true",
      past: req.query.past === "true",
      category: req.query.category as string | undefined,
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

export async function getEventController(
  req: Request,
  res: Response,
): Promise<void> {
  const result = await getEvent(req.params.id);
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}

export async function createEventController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const ip = req.headers["x-forwarded-for"]?.toString();
  const result = await createEvent(req.body, req.user, ip);
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}

export async function updateEventController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const ip = req.headers["x-forwarded-for"]?.toString();
  const result = await updateEvent(req.params.id, req.body, req.user, ip);
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}

export async function registerForEventController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  const ip = req.headers["x-forwarded-for"]?.toString();
  const result = await registerForEvent(req.params.id, req.user, ip);
  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}
