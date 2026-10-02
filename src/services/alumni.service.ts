// Alumni service — list / create / update / archive.
// Mirrors the frontend `/api/alumni` route handlers.
//
// Soft-delete model: DELETE archives the alumni record (status="archived")
// instead of hard-deleting. This preserves the alumni network history and
// allows easy reactivation.

import { db } from "../config/database";
import { recordAudit } from "../utils/logger";
import type { ResolvedUser, ServiceResult } from "../types/auth";
import type {
  CreateAlumniInput,
  PatchAlumniInput,
} from "../validators/alumni.validator";

export interface AlumniSummary {
  id: string;
  userId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  graduationYear: number;
  formerRole: string | null;
  school: string | null;
  program: string | null;
  currentOccupation: string | null;
  company: string | null;
  linkedinUrl: string | null;
  bio: string | null;
  avatarUrl: string | null;
  engagementLevel: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

function serialise(a: {
  id: string;
  userId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  graduationYear: number;
  formerRole: string | null;
  school: string | null;
  program: string | null;
  currentOccupation: string | null;
  company: string | null;
  linkedinUrl: string | null;
  bio: string | null;
  avatarUrl: string | null;
  engagementLevel: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): AlumniSummary {
  return {
    id: a.id,
    userId: a.userId,
    fullName: a.fullName,
    email: a.email,
    phone: a.phone,
    graduationYear: a.graduationYear,
    formerRole: a.formerRole,
    school: a.school,
    program: a.program,
    currentOccupation: a.currentOccupation,
    company: a.company,
    linkedinUrl: a.linkedinUrl,
    bio: a.bio,
    avatarUrl: a.avatarUrl,
    engagementLevel: a.engagementLevel,
    status: a.status,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export async function listAlumni(
  query: { engagementLevel?: string; graduationYear?: number; search?: string; status?: string },
  actor: ResolvedUser,
): Promise<
  ServiceResult<{ items: AlumniSummary[]; canManage: boolean }>
> {
  const where: Record<string, unknown> = {};

  if (query.engagementLevel) where.engagementLevel = query.engagementLevel;
  if (query.graduationYear) where.graduationYear = query.graduationYear;
  // Default to active alumni unless a status filter is explicitly provided.
  if (query.status) {
    where.status = query.status;
  } else {
    where.status = "active";
  }

  if (query.search) {
    where.OR = [
      { fullName: { contains: query.search } },
      { email: { contains: query.search } },
      { formerRole: { contains: query.search } },
      { currentOccupation: { contains: query.search } },
      { company: { contains: query.search } },
      { school: { contains: query.search } },
      { program: { contains: query.search } },
    ];
  }

  const alumni = await db.alumni.findMany({
    where,
    orderBy: [{ graduationYear: "desc" }, { fullName: "asc" }],
    take: 300,
  });

  return {
    ok: true,
    status: 200,
    data: {
      items: alumni.map(serialise),
      canManage: actor.permissions.has("alumni.manage"),
    },
  };
}

export async function createAlumni(
  input: CreateAlumniInput,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<AlumniSummary>> {
  // If a userId is provided, ensure it isn't already linked to another record.
  if (input.userId) {
    const linked = await db.alumni.findUnique({
      where: { userId: input.userId },
      select: { id: true },
    });
    if (linked) {
      return {
        ok: false,
        error: "This user is already linked to another alumni record.",
        status: 409,
      };
    }
  }

  const alumni = await db.alumni.create({
    data: {
      userId: input.userId ?? null,
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      graduationYear: input.graduationYear,
      formerRole: input.formerRole?.trim() || null,
      school: input.school?.trim() || null,
      program: input.program?.trim() || null,
      currentOccupation: input.currentOccupation?.trim() || null,
      company: input.company?.trim() || null,
      linkedinUrl: input.linkedinUrl || null,
      bio: input.bio?.trim() || null,
      avatarUrl: input.avatarUrl || null,
      engagementLevel: input.engagementLevel ?? "passive",
      status: input.status ?? "active",
    },
  });

  await recordAudit({
    actorId: actor.id,
    action: "alumni.create",
    target: `alumni:${alumni.id}`,
    context: {
      fullName: alumni.fullName,
      graduationYear: alumni.graduationYear,
      engagementLevel: alumni.engagementLevel,
    },
    ip,
  });

  return { ok: true, status: 201, data: serialise(alumni) };
}

export async function getAlumni(
  id: string,
): Promise<ServiceResult<AlumniSummary>> {
  const alumni = await db.alumni.findUnique({ where: { id } });
  if (!alumni) {
    return { ok: false, error: "Alumni not found.", status: 404 };
  }
  return { ok: true, status: 200, data: serialise(alumni) };
}

export async function updateAlumni(
  id: string,
  input: PatchAlumniInput,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<AlumniSummary>> {
  const existing = await db.alumni.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "Alumni not found.", status: 404 };
  }

  if (input.userId !== undefined && input.userId && input.userId !== existing.userId) {
    const linked = await db.alumni.findUnique({
      where: { userId: input.userId },
      select: { id: true },
    });
    if (linked && linked.id !== id) {
      return {
        ok: false,
        error: "This user is already linked to another alumni record.",
        status: 409,
      };
    }
  }

  const data: Record<string, unknown> = {};
  if (input.userId !== undefined) data.userId = input.userId || null;
  if (input.fullName !== undefined) data.fullName = input.fullName.trim();
  if (input.email !== undefined) data.email = input.email.trim().toLowerCase();
  if (input.phone !== undefined) data.phone = input.phone?.trim() || null;
  if (input.graduationYear !== undefined) data.graduationYear = input.graduationYear;
  if (input.formerRole !== undefined) data.formerRole = input.formerRole?.trim() || null;
  if (input.school !== undefined) data.school = input.school?.trim() || null;
  if (input.program !== undefined) data.program = input.program?.trim() || null;
  if (input.currentOccupation !== undefined) data.currentOccupation = input.currentOccupation?.trim() || null;
  if (input.company !== undefined) data.company = input.company?.trim() || null;
  if (input.linkedinUrl !== undefined) data.linkedinUrl = input.linkedinUrl || null;
  if (input.bio !== undefined) data.bio = input.bio?.trim() || null;
  if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl || null;
  if (input.engagementLevel !== undefined) data.engagementLevel = input.engagementLevel;
  if (input.status !== undefined) data.status = input.status;

  const alumni = await db.alumni.update({ where: { id }, data });

  await recordAudit({
    actorId: actor.id,
    action: "alumni.update",
    target: `alumni:${alumni.id}`,
    context: {
      changed: Object.keys(data),
      fullName: alumni.fullName,
      engagementLevel: alumni.engagementLevel,
    },
    ip,
  });

  return { ok: true, status: 200, data: serialise(alumni) };
}

export async function archiveAlumni(
  id: string,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<{ id: string; status: string }>> {
  const existing = await db.alumni.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "Alumni not found.", status: 404 };
  }

  const alumni = await db.alumni.update({
    where: { id },
    data: { status: "archived" },
  });

  await recordAudit({
    actorId: actor.id,
    action: "alumni.archive",
    target: `alumni:${alumni.id}`,
    context: {
      fullName: alumni.fullName,
      graduationYear: alumni.graduationYear,
      previousStatus: existing.status,
    },
    ip,
  });

  return { ok: true, status: 200, data: { id: alumni.id, status: alumni.status } };
}
