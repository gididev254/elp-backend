// Programs service — CRUD + publish. Mirrors the frontend `/api/programs/*`
// route handlers. Audit logs are recorded for create/update/archive/publish.

import { db } from "../config/database";
import { recordAudit } from "../utils/logger";
import type { ResolvedUser, ServiceResult } from "../types/auth";
import type {
  CreateProgramInput,
  PatchProgramInput,
} from "../validators/program.validator";

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
  while (await db.program.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
    if (n > 100) break;
  }
  return slug;
}

export interface ListProgramsQuery {
  status?: string;
  category?: string;
  search?: string;
}

export interface ProgramDTO {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  category: string | null;
  coverUrl: string | null;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  eventCount?: number;
}

export async function listPrograms(
  query: ListProgramsQuery,
  actor: ResolvedUser,
): Promise<ServiceResult<{ items: ProgramDTO[]; canManage: boolean }>> {
  const where: Record<string, unknown> = {};
  if (query.status && query.status !== "all") where.status = query.status;
  if (query.category) where.category = query.category;
  if (query.search) {
    where.OR = [
      { title: { contains: query.search } },
      { summary: { contains: query.search } },
    ];
  }

  const programs = await db.program.findMany({
    where,
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 100,
    include: { _count: { select: { events: true } } },
  });

  return {
    ok: true,
    status: 200,
    data: {
      items: programs.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        summary: p.summary,
        description: p.description,
        category: p.category,
        coverUrl: p.coverUrl,
        status: p.status,
        publishedAt: p.publishedAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        eventCount: p._count.events,
      })),
      canManage: actor.permissions.has("programs.manage"),
    },
  };
}

export async function getProgram(
  id: string,
): Promise<ServiceResult<ProgramDTO>> {
  const program = await db.program.findUnique({
    where: { id },
    include: { _count: { select: { events: true } } },
  });
  if (!program) return { ok: false, error: "Program not found.", status: 404 };

  return {
    ok: true,
    status: 200,
    data: {
      id: program.id,
      title: program.title,
      slug: program.slug,
      summary: program.summary,
      description: program.description,
      category: program.category,
      coverUrl: program.coverUrl,
      status: program.status,
      publishedAt: program.publishedAt?.toISOString() ?? null,
      createdAt: program.createdAt.toISOString(),
      updatedAt: program.updatedAt.toISOString(),
      archivedAt: program.archivedAt?.toISOString() ?? null,
      eventCount: program._count.events,
    },
  };
}

export async function createProgram(
  data: CreateProgramInput,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<ProgramDTO>> {
  const slug = data.slug
    ? slugify(data.slug)
    : await ensureUniqueSlug(slugify(data.title));

  const existing = await db.program.findUnique({ where: { slug } });
  if (existing) {
    return { ok: false, error: `Slug "${slug}" is already in use.`, status: 409 };
  }

  const program = await db.program.create({
    data: {
      title: data.title,
      slug,
      summary: data.summary,
      description: data.description,
      category: data.category ?? null,
      coverUrl: data.coverUrl || null,
      status: "draft",
    },
  });

  await recordAudit({
    actorId: actor.id,
    action: "program.create",
    target: `program:${program.id}`,
    context: { title: program.title, slug: program.slug },
    ip,
  });

  return {
    ok: true,
    status: 201,
    data: {
      id: program.id,
      title: program.title,
      slug: program.slug,
      summary: program.summary,
      description: program.description,
      category: program.category,
      coverUrl: program.coverUrl,
      status: program.status,
      publishedAt: null,
      createdAt: program.createdAt.toISOString(),
      updatedAt: program.updatedAt.toISOString(),
    },
  };
}

export async function updateProgram(
  id: string,
  data: PatchProgramInput,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<ProgramDTO>> {
  const existing = await db.program.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Program not found.", status: 404 };

  let nextSlug = existing.slug;
  if (data.slug && data.slug !== existing.slug) {
    nextSlug = slugify(data.slug);
    if (nextSlug !== existing.slug) {
      const clash = await db.program.findUnique({ where: { slug: nextSlug } });
      if (clash) {
        return { ok: false, error: `Slug "${nextSlug}" is already in use.`, status: 409 };
      }
    }
  }

  const program = await db.program.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.summary !== undefined ? { summary: data.summary } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.coverUrl !== undefined ? { coverUrl: data.coverUrl || null } : {}),
      ...(data.slug !== undefined ? { slug: nextSlug } : {}),
    },
  });

  await recordAudit({
    actorId: actor.id,
    action: "program.update",
    target: `program:${program.id}`,
    context: { title: program.title, changed: Object.keys(data) },
    ip,
  });

  return {
    ok: true,
    status: 200,
    data: {
      id: program.id,
      title: program.title,
      slug: program.slug,
      summary: program.summary,
      description: program.description,
      category: program.category,
      coverUrl: program.coverUrl,
      status: program.status,
      publishedAt: program.publishedAt?.toISOString() ?? null,
      createdAt: program.createdAt.toISOString(),
      updatedAt: program.updatedAt.toISOString(),
    },
  };
}

export async function archiveProgram(
  id: string,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<{ id: string; status: string }>> {
  const existing = await db.program.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Program not found.", status: 404 };

  const program = await db.program.update({
    where: { id },
    data: { status: "archived", archivedAt: new Date() },
  });

  await recordAudit({
    actorId: actor.id,
    action: "program.archive",
    target: `program:${program.id}`,
    context: { title: program.title, slug: program.slug },
    ip,
  });

  return { ok: true, status: 200, data: { id: program.id, status: program.status } };
}

export async function publishProgram(
  id: string,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<{ id: string; status: string; publishedAt: string | null }>> {
  const existing = await db.program.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Program not found.", status: 404 };
  if (existing.status === "archived") {
    return {
      ok: false,
      error: "Archived programs cannot be published. Restore first.",
      status: 400,
    };
  }

  const program = await db.program.update({
    where: { id },
    data: {
      status: "published",
      publishedAt: existing.publishedAt ?? new Date(),
      archivedAt: null,
    },
  });

  await recordAudit({
    actorId: actor.id,
    action: "program.publish",
    target: `program:${program.id}`,
    context: { title: program.title, slug: program.slug },
    ip,
  });

  return {
    ok: true,
    status: 200,
    data: {
      id: program.id,
      status: program.status,
      publishedAt: program.publishedAt?.toISOString() ?? null,
    },
  };
}
