// Mentorship service — assignments CRUD + sessions CRUD.
// Mirrors the frontend `/api/mentorship/*` route handlers.

import { db } from "../config/database";
import { recordAudit } from "../utils/logger";
import type { ResolvedUser, ServiceResult } from "../types/auth";
import type {
  CreateAssignmentInput,
  CreateSessionInput,
  ListSessionsQuery,
  PatchAssignmentInput,
  PatchSessionInput,
} from "../validators/mentorship.validator";

interface UserBrief {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

function brief(u: {
  id: string;
  email: string;
  profile: { fullName: string; preferredName: string | null; avatarUrl: string | null } | null;
}): UserBrief {
  return {
    id: u.id,
    email: u.email,
    name: u.profile?.preferredName || u.profile?.fullName || u.email,
    avatarUrl: u.profile?.avatarUrl ?? null,
  };
}

function briefNoAvatar(u: {
  id: string;
  email: string;
  profile: { fullName: string; preferredName: string | null; avatarUrl: string | null } | null;
}): { id: string; email: string; name: string } {
  return {
    id: u.id,
    email: u.email,
    name: u.profile?.preferredName || u.profile?.fullName || u.email,
  };
}

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

export async function listAssignments(
  query: { status?: string; mentorId?: string; menteeId?: string },
  actor: ResolvedUser,
): Promise<ServiceResult<{ items: unknown[]; canManage: boolean }>> {
  const where: Record<string, unknown> = {};
  if (query.status) where.status = query.status;
  if (query.mentorId) where.mentorId = query.mentorId;
  if (query.menteeId) where.menteeId = query.menteeId;

  const assignments = await db.mentorshipAssignment.findMany({
    where,
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 200,
    include: {
      mentor: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true, preferredName: true, avatarUrl: true } },
        },
      },
      mentee: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true, preferredName: true, avatarUrl: true } },
        },
      },
      _count: { select: { sessions: true } },
    },
  });

  return {
    ok: true,
    status: 200,
    data: {
      items: assignments.map((a) => ({
        id: a.id,
        mentorId: a.mentorId,
        menteeId: a.menteeId,
        programId: a.programId,
        status: a.status,
        notes: a.notes,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
        mentor: brief(a.mentor),
        mentee: brief(a.mentee),
        sessionCount: a._count.sessions,
      })),
      canManage: actor.permissions.has("mentorship.manage"),
    },
  };
}

export async function createAssignment(
  input: CreateAssignmentInput,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<unknown>> {
  if (input.mentorId === input.menteeId) {
    return {
      ok: false,
      error: "Mentor and mentee cannot be the same person.",
      status: 422,
    };
  }

  const [mentor, mentee] = await Promise.all([
    db.user.findUnique({ where: { id: input.mentorId } }),
    db.user.findUnique({ where: { id: input.menteeId } }),
  ]);
  if (!mentor) return { ok: false, error: "Mentor not found.", status: 404 };
  if (!mentee) return { ok: false, error: "Mentee not found.", status: 404 };

  const duplicate = await db.mentorshipAssignment.findFirst({
    where: {
      mentorId: input.mentorId,
      menteeId: input.menteeId,
      programId: input.programId ?? null,
      status: { in: ["active", "paused"] },
    },
  });
  if (duplicate) {
    return {
      ok: false,
      error:
        "An active mentorship pairing already exists between this mentor and mentee.",
      status: 409,
    };
  }

  let assignment;
  try {
    assignment = await db.mentorshipAssignment.create({
      data: {
        mentorId: input.mentorId,
        menteeId: input.menteeId,
        programId: input.programId ?? null,
        notes: input.notes?.trim() || null,
        status: input.status ?? "active",
      },
    });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return {
        ok: false,
        error:
          "A pairing already exists for this mentor+mentee (with the same program).",
        status: 409,
      };
    }
    throw err;
  }

  await recordAudit({
    actorId: actor.id,
    action: "mentorship.assignment.create",
    target: `mentorship:${assignment.id}`,
    context: {
      mentorId: assignment.mentorId,
      menteeId: assignment.menteeId,
      programId: assignment.programId,
      status: assignment.status,
    },
    ip,
  });

  return {
    ok: true,
    status: 201,
    data: {
      id: assignment.id,
      mentorId: assignment.mentorId,
      menteeId: assignment.menteeId,
      programId: assignment.programId,
      status: assignment.status,
      notes: assignment.notes,
      createdAt: assignment.createdAt.toISOString(),
      updatedAt: assignment.updatedAt.toISOString(),
    },
  };
}

export async function getAssignment(
  id: string,
): Promise<ServiceResult<unknown>> {
  const assignment = await db.mentorshipAssignment.findUnique({
    where: { id },
    include: {
      mentor: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true, preferredName: true, avatarUrl: true } },
        },
      },
      mentee: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true, preferredName: true, avatarUrl: true } },
        },
      },
      sessions: {
        orderBy: { heldAt: "desc" },
        select: {
          id: true,
          title: true,
          notes: true,
          heldAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
  if (!assignment) {
    return { ok: false, error: "Mentorship assignment not found.", status: 404 };
  }

  return {
    ok: true,
    status: 200,
    data: {
      id: assignment.id,
      mentorId: assignment.mentorId,
      menteeId: assignment.menteeId,
      programId: assignment.programId,
      status: assignment.status,
      notes: assignment.notes,
      createdAt: assignment.createdAt.toISOString(),
      updatedAt: assignment.updatedAt.toISOString(),
      mentor: brief(assignment.mentor),
      mentee: brief(assignment.mentee),
      sessions: assignment.sessions.map((s) => ({
        id: s.id,
        title: s.title,
        notes: s.notes,
        heldAt: s.heldAt.toISOString(),
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
    },
  };
}

export async function updateAssignment(
  id: string,
  input: PatchAssignmentInput,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<unknown>> {
  const existing = await db.mentorshipAssignment.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "Mentorship assignment not found.", status: 404 };
  }

  const data: Record<string, unknown> = {};
  if (input.notes !== undefined) data.notes = input.notes?.trim() || null;
  if (input.status !== undefined) data.status = input.status;
  if (input.programId !== undefined) data.programId = input.programId || null;

  const assignment = await db.mentorshipAssignment.update({ where: { id }, data });

  await recordAudit({
    actorId: actor.id,
    action: "mentorship.assignment.update",
    target: `mentorship:${assignment.id}`,
    context: {
      changed: Object.keys(input),
      status: assignment.status,
    },
    ip,
  });

  return {
    ok: true,
    status: 200,
    data: {
      id: assignment.id,
      mentorId: assignment.mentorId,
      menteeId: assignment.menteeId,
      programId: assignment.programId,
      status: assignment.status,
      notes: assignment.notes,
      createdAt: assignment.createdAt.toISOString(),
      updatedAt: assignment.updatedAt.toISOString(),
    },
  };
}

export async function cancelAssignment(
  id: string,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<{ id: string; status: string }>> {
  const existing = await db.mentorshipAssignment.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "Mentorship assignment not found.", status: 404 };
  }

  const assignment = await db.mentorshipAssignment.update({
    where: { id },
    data: { status: "cancelled" },
  });

  await recordAudit({
    actorId: actor.id,
    action: "mentorship.assignment.cancel",
    target: `mentorship:${assignment.id}`,
    context: {
      mentorId: assignment.mentorId,
      menteeId: assignment.menteeId,
      previousStatus: existing.status,
    },
    ip,
  });

  return {
    ok: true,
    status: 200,
    data: { id: assignment.id, status: assignment.status },
  };
}

// ---------------------------------------------------------------------------
// Sessions — flat list across all assignments
// ---------------------------------------------------------------------------

export async function listSessions(
  query: ListSessionsQuery,
  actor: ResolvedUser,
): Promise<ServiceResult<{ items: unknown[]; canManage: boolean }>> {
  const where: Record<string, unknown> = {};
  if (query.mentorId) where.mentorId = query.mentorId;
  if (query.menteeId) where.menteeId = query.menteeId;

  const range: Record<string, Date> = {};
  if (query.from) {
    const d = new Date(query.from);
    if (!Number.isNaN(d.getTime())) range.gte = d;
  }
  if (query.to) {
    const d = new Date(query.to);
    if (!Number.isNaN(d.getTime())) range.lte = d;
  }
  if (Object.keys(range).length > 0) where.heldAt = range;

  const sessions = await db.mentorshipSession.findMany({
    where,
    orderBy: { heldAt: "desc" },
    take: 300,
    include: {
      mentor: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true, preferredName: true, avatarUrl: true } },
        },
      },
      mentee: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true, preferredName: true, avatarUrl: true } },
        },
      },
      assignment: { select: { id: true, status: true } },
    },
  });

  return {
    ok: true,
    status: 200,
    data: {
      items: sessions.map((s) => ({
        id: s.id,
        assignmentId: s.assignmentId,
        mentorId: s.mentorId,
        menteeId: s.menteeId,
        title: s.title,
        notes: s.notes,
        heldAt: s.heldAt.toISOString(),
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        mentor: brief(s.mentor),
        mentee: s.mentee ? brief(s.mentee) : null,
        assignment: s.assignment
          ? { id: s.assignment.id, status: s.assignment.status }
          : null,
      })),
      canManage: actor.permissions.has("mentorship.manage"),
    },
  };
}

// ---------------------------------------------------------------------------
// Sessions — scoped to a single assignment
// ---------------------------------------------------------------------------

export async function listAssignmentSessions(
  assignmentId: string,
): Promise<ServiceResult<{ items: unknown[] }>> {
  const assignment = await db.mentorshipAssignment.findUnique({
    where: { id: assignmentId },
    select: { id: true },
  });
  if (!assignment) {
    return { ok: false, error: "Mentorship assignment not found.", status: 404 };
  }

  const sessions = await db.mentorshipSession.findMany({
    where: { assignmentId },
    orderBy: { heldAt: "desc" },
    include: {
      mentor: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true, preferredName: true, avatarUrl: true } },
        },
      },
      mentee: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true, preferredName: true, avatarUrl: true } },
        },
      },
    },
  });

  return {
    ok: true,
    status: 200,
    data: {
      items: sessions.map((s) => ({
        id: s.id,
        assignmentId: s.assignmentId,
        mentorId: s.mentorId,
        menteeId: s.menteeId,
        title: s.title,
        notes: s.notes,
        heldAt: s.heldAt.toISOString(),
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        mentor: briefNoAvatar(s.mentor),
        mentee: s.mentee ? briefNoAvatar(s.mentee) : null,
      })),
    },
  };
}

export async function createSession(
  assignmentId: string,
  input: CreateSessionInput,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<unknown>> {
  const assignment = await db.mentorshipAssignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, mentorId: true, menteeId: true },
  });
  if (!assignment) {
    return { ok: false, error: "Mentorship assignment not found.", status: 404 };
  }

  const heldAt = new Date(input.heldAt);
  if (Number.isNaN(heldAt.getTime())) {
    return { ok: false, error: "Invalid heldAt date.", status: 422 };
  }

  const session = await db.mentorshipSession.create({
    data: {
      assignmentId,
      mentorId: assignment.mentorId,
      menteeId: assignment.menteeId,
      title: input.title.trim(),
      notes: input.notes?.trim() || null,
      heldAt,
    },
  });

  await recordAudit({
    actorId: actor.id,
    action: "mentorship.session.create",
    target: `mentorship-session:${session.id}`,
    context: {
      assignmentId,
      title: session.title,
      heldAt: session.heldAt.toISOString(),
    },
    ip,
  });

  return {
    ok: true,
    status: 201,
    data: {
      id: session.id,
      assignmentId: session.assignmentId,
      mentorId: session.mentorId,
      menteeId: session.menteeId,
      title: session.title,
      notes: session.notes,
      heldAt: session.heldAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    },
  };
}

export async function updateSession(
  id: string,
  input: PatchSessionInput,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<unknown>> {
  const existing = await db.mentorshipSession.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "Session not found.", status: 404 };
  }

  let heldAt: Date | undefined;
  if (input.heldAt !== undefined) {
    heldAt = new Date(input.heldAt);
    if (Number.isNaN(heldAt.getTime())) {
      return { ok: false, error: "Invalid heldAt date.", status: 422 };
    }
  }

  const session = await db.mentorshipSession.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
      ...(heldAt !== undefined ? { heldAt } : {}),
    },
  });

  await recordAudit({
    actorId: actor.id,
    action: "mentorship.session.update",
    target: `mentorship-session:${session.id}`,
    context: {
      changed: Object.keys(input),
      title: session.title,
    },
    ip,
  });

  return {
    ok: true,
    status: 200,
    data: {
      id: session.id,
      assignmentId: session.assignmentId,
      mentorId: session.mentorId,
      menteeId: session.menteeId,
      title: session.title,
      notes: session.notes,
      heldAt: session.heldAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    },
  };
}

export async function deleteSession(
  id: string,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<{ id: string; deleted: boolean }>> {
  const existing = await db.mentorshipSession.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "Session not found.", status: 404 };
  }

  const snapshot = {
    id: existing.id,
    assignmentId: existing.assignmentId,
    mentorId: existing.mentorId,
    menteeId: existing.menteeId,
    title: existing.title,
    heldAt: existing.heldAt.toISOString(),
  };

  await db.mentorshipSession.delete({ where: { id } });

  await recordAudit({
    actorId: actor.id,
    action: "mentorship.session.delete",
    target: `mentorship-session:${id}`,
    context: snapshot,
    ip,
  });

  return { ok: true, status: 200, data: { id, deleted: true } };
}
