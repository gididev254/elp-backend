// Attendance service — list attendance for an event + record a member's status.
// Year-1 Reps are constrained to their gender cohort at the service layer.

import { db } from "../config/database";
import { recordAudit } from "../utils/logger";
import {
  getAttendanceGenderScope,
  getLeaderScopeFilter,
  canManageAttendance,
} from "../permissions/representativePermissions";
import type { ResolvedUser, ServiceResult } from "../types/auth";

export interface AttendanceRow {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userEmail: string;
  gender: string | null;
  yearOfStudy: number | null;
  status: string;
  note: string | null;
  recordedAt: string;
}

export interface EligibleLeader {
  id: string;
  email: string;
  fullName: string;
  preferredName: string | null;
  gender: string | null;
  yearOfStudy: number | null;
  avatarUrl: string | null;
  school: string | null;
  program: string | null;
  isRegistered: boolean;
  executiveRole: { key: string; name: string } | null;
}

export interface ExistingAttendance {
  id: string;
  userId: string;
  status: string;
  note: string | null;
  recordedAt: string;
}

export interface EventAttendanceResponse {
  event: {
    id: string;
    title: string;
    slug: string;
    startAt: string;
    venue: string | null;
    status: string;
    program: { id: string; title: string; slug: string } | null;
  };
  attendance: ExistingAttendance[];
  eligibleLeaders: EligibleLeader[];
  registeredCount: number;
  scope: {
    restrictToCohort: boolean;
    readOnly: boolean;
    gender: string | null;
    yearOfStudy: number | null;
  };
  canManage: boolean;
  canDelete: boolean;
  currentUserId: string;
}

export async function listEventAttendance(
  eventId: string,
  actor: ResolvedUser,
): Promise<ServiceResult<EventAttendanceResponse>> {
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: { program: true },
  });
  if (!event) return { ok: false, error: "Event not found.", status: 404 };

  // Cohort scope for the actor — used to filter eligible leaders.
  const scope = getLeaderScopeFilter(actor);
  const genderScope = getAttendanceGenderScope(actor);

  // Eligible leaders: users with a Profile (chapter leaders), filtered by cohort.
  const leaderWhere: Record<string, unknown> = {};
  if (scope.gender) leaderWhere.gender = scope.gender;
  if (scope.yearOfStudy) leaderWhere.yearOfStudy = scope.yearOfStudy;

  const profiles = await db.profile.findMany({
    where: leaderWhere,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          status: true,
          userRoles: {
            include: {
              role: {
                select: { key: true, name: true, isExecutive: true },
              },
            },
          },
          registrations: { where: { eventId }, select: { id: true } },
        },
      },
    },
    orderBy: { fullName: "asc" },
  });

  // Existing attendance rows for this event, keyed by userId.
  const attendanceRows = await db.attendance.findMany({
    where: { eventId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true, gender: true, yearOfStudy: true } },
        },
      },
    },
    orderBy: { recordedAt: "desc" },
  });

  const attendanceByUserId = new Map<string, ExistingAttendance>();
  for (const r of attendanceRows) {
    // Cohort scope: if a Year-1 Rep is viewing, hide attendees outside their cohort.
    if ((genderScope === "male" || genderScope === "female") && r.user.profile?.gender !== genderScope) {
      continue;
    }
    attendanceByUserId.set(r.user.id, {
      id: r.id,
      userId: r.user.id,
      status: r.status,
      note: r.note,
      recordedAt: r.recordedAt.toISOString(),
    });
  }

  const eligibleLeaders: EligibleLeader[] = profiles
    .filter((p) => p.user.status === "active")
    .map((p) => {
      const execRole = p.user.userRoles
        .map((ur) => ur.role)
        .filter((r) => r.isExecutive)
        .map((r) => ({ key: r.key, name: r.name }))[0] ?? null;
      return {
        id: p.user.id,
        email: p.user.email,
        fullName: p.fullName,
        preferredName: p.preferredName,
        gender: p.gender,
        yearOfStudy: p.yearOfStudy,
        avatarUrl: p.avatarUrl,
        school: p.school,
        program: p.program,
        isRegistered: p.user.registrations.length > 0,
        executiveRole: execRole,
      };
    });

  // Registered count = distinct users registered for this event (within scope).
  const registeredCount = await db.eventRegistration.count({ where: { eventId } });

  return {
    ok: true,
    status: 200,
    data: {
      event: {
        id: event.id,
        title: event.title,
        slug: event.slug,
        startAt: event.startAt.toISOString(),
        venue: event.venue,
        status: event.status,
        program: event.program
          ? { id: event.program.id, title: event.program.title, slug: event.program.slug }
          : null,
      },
      attendance: Array.from(attendanceByUserId.values()),
      eligibleLeaders,
      registeredCount,
      scope: {
        restrictToCohort: scope.restrictToCohort,
        readOnly: scope.readOnly,
        gender: scope.gender ?? null,
        yearOfStudy: scope.yearOfStudy ?? null,
      },
      canManage: canManageAttendance(actor),
      canDelete: actor.permissions.has("admin.system") || actor.permissions.has("attendance.manage"),
      currentUserId: actor.id,
    },
  };
}

export interface RecordAttendanceInput {
  eventId: string;
  userId: string;
  status: "present" | "absent" | "late" | "excused";
  note?: string;
}

export async function recordAttendance(
  input: RecordAttendanceInput,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<{ id: string; status: string }>> {
  const event = await db.event.findUnique({ where: { id: input.eventId } });
  if (!event) return { ok: false, error: "Event not found.", status: 404 };

  const target = await db.user.findUnique({
    where: { id: input.userId },
    include: { profile: true },
  });
  if (!target) return { ok: false, error: "User not found.", status: 404 };

  // Cohort scope — Year-1 reps can only record attendance for members of
  // their own gender cohort.
  const genderScope = getAttendanceGenderScope(actor);
  if (genderScope === "male" || genderScope === "female") {
    if (target.profile?.gender !== genderScope) {
      return {
        ok: false,
        error: "You can only record attendance for members of your own cohort.",
        status: 403,
      };
    }
  } else if (genderScope === null) {
    return {
      ok: false,
      error: "You do not have permission to record attendance.",
      status: 403,
    };
  }

  // Upsert by (eventId, userId).
  const row = await db.attendance.upsert({
    where: { eventId_userId: { eventId: input.eventId, userId: input.userId } },
    update: { status: input.status, note: input.note ?? null, recordedAt: new Date() },
    create: {
      eventId: input.eventId,
      userId: input.userId,
      status: input.status,
      note: input.note ?? null,
    },
  });

  await recordAudit({
    actorId: actor.id,
    action: "attendance.record",
    target: `attendance:${row.id}`,
    context: {
      eventId: input.eventId,
      userId: input.userId,
      status: input.status,
    },
    ip,
  });

  return { ok: true, status: 201, data: { id: row.id, status: row.status } };
}

export interface RecordAttendanceBulkInput {
  eventId: string;
  records: Array<{ userId: string; status: "present" | "absent" | "late" | "excused"; note?: string }>;
}

export interface RecordAttendanceBulkResult {
  updated: number;
  ids: string[];
}

export async function recordAttendanceBulk(
  input: RecordAttendanceBulkInput,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<RecordAttendanceBulkResult>> {
  const event = await db.event.findUnique({ where: { id: input.eventId } });
  if (!event) return { ok: false, error: "Event not found.", status: 404 };

  const genderScope = getAttendanceGenderScope(actor);
  if (genderScope === null) {
    return {
      ok: false,
      error: "You do not have permission to record attendance.",
      status: 403,
    };
  }

  // Fetch all target profiles once to enforce cohort scope and validate.
  const targetIds = Array.from(new Set(input.records.map((r) => r.userId)));
  const targets = await db.user.findMany({
    where: { id: { in: targetIds } },
    include: { profile: true },
  });
  const targetMap = new Map(targets.map((u) => [u.id, u]));

  const ids: string[] = [];
  for (const rec of input.records) {
    const target = targetMap.get(rec.userId);
    if (!target) {
      return { ok: false, error: `User not found: ${rec.userId}`, status: 404 };
    }
    if ((genderScope === "male" || genderScope === "female") && target.profile?.gender !== genderScope) {
      return {
        ok: false,
        error: `You can only record attendance for members of your own cohort: ${rec.userId}`,
        status: 403,
      };
    }
    const row = await db.attendance.upsert({
      where: { eventId_userId: { eventId: input.eventId, userId: rec.userId } },
      update: { status: rec.status, note: rec.note ?? null, recordedAt: new Date() },
      create: {
        eventId: input.eventId,
        userId: rec.userId,
        status: rec.status,
        note: rec.note ?? null,
      },
    });
    ids.push(row.id);
  }

  await recordAudit({
    actorId: actor.id,
    action: "attendance.bulk",
    target: `attendance:${input.eventId}`,
    context: {
      eventId: input.eventId,
      count: ids.length,
      ids,
    },
    ip,
  });

  return { ok: true, status: 201, data: { updated: ids.length, ids } };
}
