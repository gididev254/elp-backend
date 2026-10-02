// Search service — cross-module search with RBAC filtering.
// Mirrors the frontend `/api/search` route handler.

import { db } from "../config/database";
import { getLeaderScopeFilter } from "../permissions/representativePermissions";
import { hasPermission } from "./auth.service";
import type { ResolvedUser, ServiceResult } from "../types/auth";

export interface SearchResult {
  type: "leaders" | "events" | "news" | "programs" | "gallery" | "resources";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  imageUrl?: string;
}

export async function searchAll(
  q: string,
  user: ResolvedUser,
): Promise<ServiceResult<{ results: SearchResult[] }>> {
  if (q.length < 2) {
    return { ok: true, status: 200, data: { results: [] } };
  }

  const [leaders, events, news, programs, gallery, resources] = await Promise.all([
    searchLeaders(q, user),
    searchEvents(q),
    searchNews(q),
    searchPrograms(q),
    searchGallery(q),
    searchResources(q, user),
  ]);

  const results: SearchResult[] = [
    ...leaders,
    ...events,
    ...news,
    ...programs,
    ...gallery,
    ...resources,
  ];

  return { ok: true, status: 200, data: { results } };
}

async function searchLeaders(
  q: string,
  user: ResolvedUser,
): Promise<SearchResult[]> {
  const scope = getLeaderScopeFilter(user);
  const hasLeadersView =
    user.permissions.has("leaders.view") ||
    user.permissions.has("leaders.view.male_y1") ||
    user.permissions.has("leaders.view.female_y1") ||
    user.permissions.has("leaders.view.female_y1_readonly") ||
    user.permissions.has("admin.system");

  if (!hasLeadersView) {
    // Leader with no leaders.view at all — can only see themselves.
    const self = await db.user.findFirst({
      where: {
        id: user.id,
        OR: [
          { email: { contains: q } },
          { profile: { fullName: { contains: q } } },
        ],
      },
      include: { profile: true },
    });
    if (!self) return [];
    return [
      {
        type: "leaders",
        id: self.id,
        title: self.profile?.fullName ?? self.email,
        subtitle: self.email,
        href: "/dashboard/leaders",
        imageUrl: self.profile?.avatarUrl ?? undefined,
      },
    ];
  }

  const where: Record<string, unknown> = {
    status: "active",
    userRoles: { some: { role: { key: "LEADER" } } },
    OR: [
      { email: { contains: q } },
      { profile: { fullName: { contains: q } } },
      { profile: { preferredName: { contains: q } } },
    ],
  };
  if (scope.restrictToCohort) {
    where.profile = {
      ...(scope.gender ? { gender: scope.gender } : {}),
      ...(scope.yearOfStudy ? { yearOfStudy: scope.yearOfStudy } : {}),
    };
  }

  const leaders = await db.user.findMany({
    where,
    include: { profile: true },
    take: 5,
    orderBy: { profile: { fullName: "asc" } },
  });

  return leaders.map((l) => ({
    type: "leaders" as const,
    id: l.id,
    title: l.profile?.fullName ?? l.email,
    subtitle: l.profile?.school ?? l.email,
    href: "/dashboard/leaders",
    imageUrl: l.profile?.avatarUrl ?? undefined,
  }));
}

async function searchEvents(q: string): Promise<SearchResult[]> {
  const events = await db.event.findMany({
    where: {
      status: { in: ["published", "ongoing"] },
      OR: [{ title: { contains: q } }, { summary: { contains: q } }],
    },
    take: 5,
    orderBy: { startAt: "desc" },
    select: {
      id: true,
      title: true,
      summary: true,
      slug: true,
      startAt: true,
      venue: true,
      coverUrl: true,
    },
  });
  return events.map((e) => ({
    type: "events" as const,
    id: e.id,
    title: e.title,
    subtitle: [e.startAt.toLocaleDateString(), e.venue].filter(Boolean).join(" · "),
    href: `/events/${e.slug}`,
    imageUrl: e.coverUrl ?? undefined,
  }));
}

async function searchNews(q: string): Promise<SearchResult[]> {
  const news = await db.newsArticle.findMany({
    where: {
      status: "published",
      OR: [{ title: { contains: q } }, { summary: { contains: q } }],
    },
    take: 5,
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      summary: true,
      slug: true,
      category: true,
      coverUrl: true,
    },
  });
  return news.map((n) => ({
    type: "news" as const,
    id: n.id,
    title: n.title,
    subtitle: n.category ?? undefined,
    href: `/news/${n.slug}`,
    imageUrl: n.coverUrl ?? undefined,
  }));
}

async function searchPrograms(q: string): Promise<SearchResult[]> {
  const programs = await db.program.findMany({
    where: {
      status: "published",
      OR: [{ title: { contains: q } }, { summary: { contains: q } }],
    },
    take: 5,
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      summary: true,
      slug: true,
      category: true,
      coverUrl: true,
    },
  });
  return programs.map((p) => ({
    type: "programs" as const,
    id: p.id,
    title: p.title,
    subtitle: p.category ?? undefined,
    href: `/programs/${p.slug}`,
    imageUrl: p.coverUrl ?? undefined,
  }));
}

async function searchGallery(q: string): Promise<SearchResult[]> {
  const gallery = await db.galleryMedia.findMany({
    where: {
      status: "published",
      OR: [{ title: { contains: q } }, { caption: { contains: q } }],
    },
    take: 5,
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, caption: true, imageUrl: true, album: true },
  });
  return gallery.map((g) => ({
    type: "gallery" as const,
    id: g.id,
    title: g.title,
    subtitle: g.album ?? g.caption ?? undefined,
    href: "/gallery",
    imageUrl: g.imageUrl,
  }));
}

async function searchResources(
  q: string,
  user: ResolvedUser,
): Promise<SearchResult[]> {
  // Visibility filter — executives see all; leaders see public + leaders; others (public) see public only.
  let visibility: string[] = ["public"];
  if (hasPermission(user, "admin.system") || hasPermission(user, "resources.manage")) {
    visibility = ["public", "leaders", "executive"];
  } else if (
    hasPermission(user, "leaders.view") ||
    hasPermission(user, "leaders.view.male_y1") ||
    hasPermission(user, "leaders.view.female_y1") ||
    hasPermission(user, "leaders.view.female_y1_readonly")
  ) {
    visibility = ["public", "leaders"];
  }

  const resources = await db.resource.findMany({
    where: {
      status: "published",
      visibility: { in: visibility },
      OR: [{ title: { contains: q } }, { description: { contains: q } }],
    },
    take: 5,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      slug: true,
      category: true,
      externalUrl: true,
    },
  });
  return resources.map((r) => ({
    type: "resources" as const,
    id: r.id,
    title: r.title,
    subtitle: r.category ?? r.description ?? undefined,
    href: r.externalUrl ?? "/resources",
  }));
}
