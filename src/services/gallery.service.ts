// Gallery service — list / create / update / hard delete.
// Mirrors the frontend `/api/gallery` route handlers.

import { db } from "../config/database";
import { recordAudit } from "../utils/logger";
import type { ResolvedUser, ServiceResult } from "../types/auth";
import type {
  CreateGalleryInput,
  ListGalleryQuery,
  PatchGalleryInput,
} from "../validators/gallery.validator";

export interface GallerySummary {
  id: string;
  title: string;
  caption: string | null;
  imageUrl: string;
  album: string | null;
  eventId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

function serialise(m: {
  id: string;
  title: string;
  caption: string | null;
  imageUrl: string;
  album: string | null;
  eventId: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): GallerySummary {
  return {
    id: m.id,
    title: m.title,
    caption: m.caption,
    imageUrl: m.imageUrl,
    album: m.album,
    eventId: m.eventId,
    status: m.status,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

export async function listGallery(
  query: ListGalleryQuery,
  actor: ResolvedUser,
): Promise<ServiceResult<{ items: GallerySummary[]; canManage: boolean }>> {
  const where: Record<string, unknown> = {};
  if (query.status && query.status !== "all") where.status = query.status;
  if (query.album && query.album !== "all") where.album = query.album;
  if (query.search) {
    where.OR = [
      { title: { contains: query.search } },
      { caption: { contains: query.search } },
      { album: { contains: query.search } },
    ];
  }

  const media = await db.galleryMedia.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    take: 200,
  });

  return {
    ok: true,
    status: 200,
    data: {
      items: media.map(serialise),
      canManage: actor.permissions.has("gallery.manage"),
    },
  };
}

export async function createGallery(
  input: CreateGalleryInput,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<GallerySummary>> {
  const media = await db.galleryMedia.create({
    data: {
      title: input.title,
      imageUrl: input.imageUrl,
      caption: input.caption || null,
      album: input.album || null,
      eventId: input.eventId || null,
      status: input.status ?? "published",
    },
  });

  await recordAudit({
    actorId: actor.id,
    action: "gallery.create",
    target: `gallery:${media.id}`,
    context: {
      title: media.title,
      album: media.album,
      status: media.status,
    },
    ip,
  });

  return { ok: true, status: 201, data: serialise(media) };
}

export async function getGallery(
  id: string,
): Promise<ServiceResult<GallerySummary>> {
  const m = await db.galleryMedia.findUnique({ where: { id } });
  if (!m) return { ok: false, error: "Gallery media not found.", status: 404 };
  return { ok: true, status: 200, data: serialise(m) };
}

export async function updateGallery(
  id: string,
  input: PatchGalleryInput,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<GallerySummary>> {
  const existing = await db.galleryMedia.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "Gallery media not found.", status: 404 };
  }

  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl;
  if (input.caption !== undefined) data.caption = input.caption || null;
  if (input.album !== undefined) data.album = input.album || null;
  if (input.eventId !== undefined) data.eventId = input.eventId || null;
  if (input.status !== undefined) data.status = input.status;

  const media = await db.galleryMedia.update({ where: { id }, data });

  await recordAudit({
    actorId: actor.id,
    action: "gallery.update",
    target: `gallery:${media.id}`,
    context: {
      title: media.title,
      changed: Object.keys(input),
    },
    ip,
  });

  return { ok: true, status: 200, data: serialise(media) };
}

export async function deleteGallery(
  id: string,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<{ id: string; deleted: boolean }>> {
  const existing = await db.galleryMedia.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "Gallery media not found.", status: 404 };
  }

  await db.galleryMedia.delete({ where: { id } });

  await recordAudit({
    actorId: actor.id,
    action: "gallery.delete",
    target: `gallery:${existing.id}`,
    context: {
      title: existing.title,
      imageUrl: existing.imageUrl,
    },
    ip,
  });

  return { ok: true, status: 200, data: { id: existing.id, deleted: true } };
}
