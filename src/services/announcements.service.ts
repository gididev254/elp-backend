// Announcements service — list/create/update. Mirrors frontend `/api/announcements/*`.

import { db } from "../config/database";
import { recordAudit } from "../utils/logger";
import type { ResolvedUser, ServiceResult } from "../types/auth";

export const AUDIENCES = [
  "all",
  "leaders",
  "executive",
  "year1",
  "male_y1",
  "female_y1",
] as const;

export const AUDIENCE_LABELS: Record<string, string> = {
  all: "Everyone",
  leaders: "All Leaders",
  executive: "Executive Committee",
  year1: "Year 1 (All)",
  male_y1: "Male Year 1",
  female_y1: "Female Year 1",
};

export interface ListAnnouncementsQuery {
  status?: string;
  audience?: string;
  search?: string;
}

export interface AnnouncementDTO {
  id: string;
  title: string;
  body: string;
  audience: string;
  audienceLabel: string;
  status: string;
  publishedAt: string | null;
  authorId: string | null;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listAnnouncements(
  query: ListAnnouncementsQuery,
  actor: ResolvedUser,
): Promise<ServiceResult<{ items: AnnouncementDTO[]; canManage: boolean }>> {
  const where: Record<string, unknown> = {};
  if (query.status && query.status !== "all") where.status = query.status;
  if (query.audience && query.audience !== "all") where.audience = query.audience;
  if (query.search) {
    where.OR = [
      { title: { contains: query.search } },
      { body: { contains: query.search } },
    ];
  }

  const announcements = await db.announcement.findMany({
    where,
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 100,
    include: {
      author: {
        select: {
          id: true,
          profile: { select: { preferredName: true, fullName: true } },
        },
      },
    },
  });

  return {
    ok: true,
    status: 200,
    data: {
      items: announcements.map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        audience: a.audience,
        audienceLabel: AUDIENCE_LABELS[a.audience] ?? a.audience,
        status: a.status,
        publishedAt: a.publishedAt?.toISOString() ?? null,
        authorId: a.authorId,
        authorName:
          a.author?.profile?.preferredName ??
          a.author?.profile?.fullName ??
          null,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
      canManage: actor.permissions.has("announcements.manage"),
    },
  };
}

export async function getAnnouncement(
  id: string,
): Promise<ServiceResult<AnnouncementDTO>> {
  const a = await db.announcement.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          profile: { select: { preferredName: true, fullName: true } },
        },
      },
    },
  });
  if (!a) return { ok: false, error: "Announcement not found.", status: 404 };

  return {
    ok: true,
    status: 200,
    data: {
      id: a.id,
      title: a.title,
      body: a.body,
      audience: a.audience,
      audienceLabel: AUDIENCE_LABELS[a.audience] ?? a.audience,
      status: a.status,
      publishedAt: a.publishedAt?.toISOString() ?? null,
      authorId: a.authorId,
      authorName:
        a.author?.profile?.preferredName ??
        a.author?.profile?.fullName ??
        null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    },
  };
}

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  audience?: (typeof AUDIENCES)[number];
  status?: "draft" | "published";
}

export async function createAnnouncement(
  data: CreateAnnouncementInput,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<AnnouncementDTO>> {
  const status: "draft" | "published" = data.status ?? "draft";
  const now = new Date();

  const announcement = await db.announcement.create({
    data: {
      title: data.title,
      body: data.body,
      audience: data.audience ?? "all",
      status,
      publishedAt: status === "published" ? now : null,
      authorId: actor.id,
    },
    include: {
      author: {
        select: {
          profile: { select: { preferredName: true, fullName: true } },
        },
      },
    },
  });

  await recordAudit({
    actorId: actor.id,
    action: "announcement.create",
    target: `announcement:${announcement.id}`,
    context: {
      title: announcement.title,
      audience: announcement.audience,
      status: announcement.status,
    },
    ip,
  });

  return {
    ok: true,
    status: 201,
    data: {
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      audience: announcement.audience,
      audienceLabel: AUDIENCE_LABELS[announcement.audience] ?? announcement.audience,
      status: announcement.status,
      publishedAt: announcement.publishedAt?.toISOString() ?? null,
      authorId: announcement.authorId,
      authorName:
        announcement.author?.profile?.preferredName ??
        announcement.author?.profile?.fullName ??
        null,
      createdAt: announcement.createdAt.toISOString(),
      updatedAt: announcement.updatedAt.toISOString(),
    },
  };
}

export interface PatchAnnouncementInput {
  title?: string;
  body?: string;
  audience?: (typeof AUDIENCES)[number];
  status?: "draft" | "published" | "archived";
}

export async function updateAnnouncement(
  id: string,
  data: PatchAnnouncementInput,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<AnnouncementDTO>> {
  const existing = await db.announcement.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Announcement not found.", status: 404 };

  const update: Record<string, unknown> = {};
  if (data.title !== undefined) update.title = data.title;
  if (data.body !== undefined) update.body = data.body;
  if (data.audience !== undefined) update.audience = data.audience;
  if (data.status !== undefined) {
    update.status = data.status;
    if (data.status === "published" && !existing.publishedAt) {
      update.publishedAt = new Date();
    }
    if (data.status !== "published") update.publishedAt = existing.publishedAt;
  }

  const announcement = await db.announcement.update({ where: { id }, data: update });

  await recordAudit({
    actorId: actor.id,
    action: "announcement.update",
    target: `announcement:${announcement.id}`,
    context: { title: announcement.title, changed: Object.keys(data) },
    ip,
  });

  // Re-fetch with author relation for the serialised response.
  const withAuthor = await db.announcement.findUnique({
    where: { id: announcement.id },
    include: {
      author: {
        select: {
          profile: { select: { preferredName: true, fullName: true } },
        },
      },
    },
  });

  return {
    ok: true,
    status: 200,
    data: {
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      audience: announcement.audience,
      audienceLabel: AUDIENCE_LABELS[announcement.audience] ?? announcement.audience,
      status: announcement.status,
      publishedAt: announcement.publishedAt?.toISOString() ?? null,
      authorId: announcement.authorId,
      authorName:
        withAuthor?.author?.profile?.preferredName ??
        withAuthor?.author?.profile?.fullName ??
        null,
      createdAt: announcement.createdAt.toISOString(),
      updatedAt: announcement.updatedAt.toISOString(),
    },
  };
}
