// Events service — list/create/update/register. Mirrors frontend `/api/events/*`.

import { db } from "../config/database";
import { recordAudit } from "../utils/logger";
import type { ResolvedUser, ServiceResult } from "../types/auth";
import type {
  CreateEventInput,
  PatchEventInput,
} from "../validators/event.validator";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base;
  let n = 1;
  while (await db.event.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
    if (n > 100) break;
  }
  return slug;
}

export interface ListEventsQuery {
  status?: string;
  upcoming?: boolean;
  past?: boolean;
  category?: string;
  search?: string;
}

export interface EventDTO {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  category: string | null;
  coverUrl: string | null;
  venue: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  status: string;
  publishedAt?: string | null;
  capacity: number | null;
  programId: string | null;
  program?: { id: string; title: string; slug: string } | null;
  createdAt: string;
  updatedAt: string;
  registrationCount?: number;
  canManage?: boolean;
  currentUserId?: string;
}

export async function listEvents(
  query: ListEventsQuery,
  actor: ResolvedUser,
): Promise<ServiceResult<{ items: EventDTO[]; canManage: boolean; currentUserId: string }>> {
  const where: Record<string, unknown> = {};
  if (query.status && query.status !== "all") where.status = query.status;
  if (query.category) where.category = query.category;
  if (query.upcoming) where.startAt = { gte: new Date() };
  if (query.past) where.startAt = { lt: new Date() };
  if (query.search) {
    where.OR = [
      { title: { contains: query.search } },
      { summary: { contains: query.search } },
      { venue: { contains: query.search } },
      { location: { contains: query.search } },
    ];
  }

  const events = await db.event.findMany({
    where,
    orderBy: query.upcoming ? { startAt: "asc" } : { startAt: "desc" },
    take: 100,
    include: {
      _count: { select: { registrations: true } },
      program: { select: { id: true, title: true, slug: true } },
    },
  });

  return {
    ok: true,
    status: 200,
    data: {
      items: events.map((e) => ({
        id: e.id,
        title: e.title,
        slug: e.slug,
        summary: e.summary,
        description: e.description,
        category: e.category,
        coverUrl: e.coverUrl,
        venue: e.venue,
        location: e.location,
        startAt: e.startAt.toISOString(),
        endAt: e.endAt?.toISOString() ?? null,
        status: e.status,
        publishedAt: e.publishedAt?.toISOString() ?? null,
        capacity: e.capacity,
        programId: e.programId,
        program: e.program,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
        registrationCount: e._count.registrations,
      })),
      canManage: actor.permissions.has("events.manage"),
      currentUserId: actor.id,
    },
  };
}

export async function getEvent(
  id: string,
): Promise<ServiceResult<EventDTO>> {
  const event = await db.event.findUnique({
    where: { id },
    include: {
      _count: { select: { registrations: true, attendance: true } },
      program: { select: { id: true, title: true, slug: true } },
    },
  });
  if (!event) return { ok: false, error: "Event not found.", status: 404 };

  return {
    ok: true,
    status: 200,
    data: {
      id: event.id,
      title: event.title,
      slug: event.slug,
      summary: event.summary,
      description: event.description,
      category: event.category,
      coverUrl: event.coverUrl,
      venue: event.venue,
      location: event.location,
      startAt: event.startAt.toISOString(),
      endAt: event.endAt?.toISOString() ?? null,
      status: event.status,
      publishedAt: event.publishedAt?.toISOString() ?? null,
      capacity: event.capacity,
      programId: event.programId,
      program: event.program,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      registrationCount: event._count.registrations,
    },
  };
}

export async function createEvent(
  data: CreateEventInput,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<EventDTO>> {
  const startAt = new Date(data.startAt);
  if (isNaN(startAt.getTime())) {
    return { ok: false, error: "startAt is not a valid date.", status: 422 };
  }
  let endAt: Date | null = null;
  if (data.endAt) {
    endAt = new Date(data.endAt);
    if (isNaN(endAt.getTime())) {
      return { ok: false, error: "endAt is not a valid date.", status: 422 };
    }
    if (endAt < startAt) {
      return { ok: false, error: "endAt cannot be before startAt.", status: 422 };
    }
  }

  const slug = data.slug
    ? slugify(data.slug)
    : await ensureUniqueSlug(slugify(data.title));

  const existing = await db.event.findUnique({ where: { slug } });
  if (existing) {
    return { ok: false, error: `Slug "${slug}" is already in use.`, status: 409 };
  }

  const event = await db.event.create({
    data: {
      title: data.title,
      slug,
      summary: data.summary,
      description: data.description,
      category: data.category ?? null,
      coverUrl: data.coverUrl || null,
      venue: data.venue || null,
      location: data.location || null,
      startAt,
      endAt,
      capacity: data.capacity ?? null,
      programId: data.programId || null,
      status: "draft",
    },
  });

  await recordAudit({
    actorId: actor.id,
    action: "event.create",
    target: `event:${event.id}`,
    context: {
      title: event.title,
      slug: event.slug,
      startAt: event.startAt.toISOString(),
    },
    ip,
  });

  return {
    ok: true,
    status: 201,
    data: {
      id: event.id,
      title: event.title,
      slug: event.slug,
      summary: event.summary,
      description: event.description,
      category: event.category,
      coverUrl: event.coverUrl,
      venue: event.venue,
      location: event.location,
      startAt: event.startAt.toISOString(),
      endAt: event.endAt?.toISOString() ?? null,
      status: event.status,
      capacity: event.capacity,
      programId: event.programId,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    },
  };
}

export async function updateEvent(
  id: string,
  data: PatchEventInput,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<EventDTO>> {
  const existing = await db.event.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Event not found.", status: 404 };

  let nextSlug = existing.slug;
  if (data.slug && data.slug !== existing.slug) {
    nextSlug = slugify(data.slug);
    if (nextSlug !== existing.slug) {
      const clash = await db.event.findUnique({ where: { slug: nextSlug } });
      if (clash) {
        return { ok: false, error: `Slug "${nextSlug}" is already in use.`, status: 409 };
      }
    }
  }

  const startAt = data.startAt ? new Date(data.startAt) : undefined;
  let endAt: Date | null | undefined = undefined;
  if (data.endAt === null) endAt = null;
  else if (data.endAt) endAt = new Date(data.endAt);

  if (startAt && isNaN(startAt.getTime())) {
    return { ok: false, error: "startAt is not a valid date.", status: 422 };
  }
  if (endAt && isNaN(endAt.getTime())) {
    return { ok: false, error: "endAt is not a valid date.", status: 422 };
  }
  const finalStart = startAt ?? existing.startAt;
  const finalEnd = endAt === null ? null : endAt ?? existing.endAt;
  if (finalEnd && finalEnd < finalStart) {
    return { ok: false, error: "endAt cannot be before startAt.", status: 422 };
  }

  const event = await db.event.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.summary !== undefined ? { summary: data.summary } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.coverUrl !== undefined ? { coverUrl: data.coverUrl || null } : {}),
      ...(data.venue !== undefined ? { venue: data.venue } : {}),
      ...(data.location !== undefined ? { location: data.location } : {}),
      ...(startAt !== undefined ? { startAt } : {}),
      ...(endAt !== undefined ? { endAt: endAt } : {}),
      ...(data.capacity !== undefined ? { capacity: data.capacity } : {}),
      ...(data.programId !== undefined ? { programId: data.programId || null } : {}),
      ...(data.slug !== undefined ? { slug: nextSlug } : {}),
    },
  });

  await recordAudit({
    actorId: actor.id,
    action: "event.update",
    target: `event:${event.id}`,
    context: { title: event.title, changed: Object.keys(data) },
    ip,
  });

  return {
    ok: true,
    status: 200,
    data: {
      id: event.id,
      title: event.title,
      slug: event.slug,
      summary: event.summary,
      description: event.description,
      category: event.category,
      coverUrl: event.coverUrl,
      venue: event.venue,
      location: event.location,
      startAt: event.startAt.toISOString(),
      endAt: event.endAt?.toISOString() ?? null,
      status: event.status,
      capacity: event.capacity,
      programId: event.programId,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    },
  };
}

export async function registerForEvent(
  id: string,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<{ id: string; eventId: string; status: string; createdAt: string }>> {
  const event = await db.event.findUnique({
    where: { id },
    include: { _count: { select: { registrations: true } } },
  });
  if (!event) return { ok: false, error: "Event not found.", status: 404 };

  if (!["published", "ongoing"].includes(event.status)) {
    return { ok: false, error: "Registration is closed for this event.", status: 403 };
  }

  if (event.capacity && event.capacity > 0) {
    const activeCount = await db.eventRegistration.count({
      where: { eventId: id, status: "registered" },
    });
    if (activeCount >= event.capacity) {
      return { ok: false, error: "This event is at full capacity.", status: 409 };
    }
  }

  const existing = await db.eventRegistration.findUnique({
    where: { eventId_userId: { eventId: id, userId: actor.id } },
  });
  if (existing && existing.status === "registered") {
    return {
      ok: false,
      error: "You are already registered for this event.",
      status: 409,
    };
  }

  const registration = await db.eventRegistration.upsert({
    where: { eventId_userId: { eventId: id, userId: actor.id } },
    update: { status: "registered" },
    create: { eventId: id, userId: actor.id, status: "registered" },
  });

  await recordAudit({
    actorId: actor.id,
    action: "event.register",
    target: `event:${event.id}`,
    context: {
      title: event.title,
      registrationId: registration.id,
      status: registration.status,
    },
    ip,
  });

  return {
    ok: true,
    status: 201,
    data: {
      id: registration.id,
      eventId: event.id,
      status: registration.status,
      createdAt: registration.createdAt.toISOString(),
    },
  };
}
