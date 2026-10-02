// Gallery controller — list / create / get / update / delete.

import type { Request, Response } from "express";
import {
  listGallery,
  createGallery,
  getGallery,
  updateGallery,
  deleteGallery,
} from "../services/gallery.service";
import { ok, fail } from "../utils/response";

function clientIp(req: Request): string | undefined {
  return req.headers["x-forwarded-for"]?.toString();
}

export async function listGalleryController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await listGallery(
    {
      status: req.query.status as string | undefined,
      album: req.query.album as string | undefined,
      search: req.query.search as string | undefined,
    },
    req.user,
  );
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function createGalleryController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await createGallery(req.body, req.user, clientIp(req));
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function getGalleryController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await getGallery(req.params.id);
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function updateGalleryController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await updateGallery(req.params.id, req.body, req.user, clientIp(req));
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function deleteGalleryController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await deleteGallery(req.params.id, req.user, clientIp(req));
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}
