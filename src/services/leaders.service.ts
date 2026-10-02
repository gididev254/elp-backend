// Leaders service — list and detail with Year-1 Rep cohort scoping.
// Mirrors the frontend `/api/leaders` route handler. Scope is enforced at
// the service layer (Prisma `where` clause) — not just UI hiding.

import { db } from "../config/database";
import { getLeaderScopeFilter } from "../permissions/representativePermissions";
import { recordAudit } from "../utils/logger";
import type { ResolvedUser, ServiceResult } from "../types/auth";

export interface ListLeadersQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  year?: number;
  school?: string;
  gender?: string;
}

interface LeaderWithRelations {
  id: string;
  email: string;
  status: string;
  profile: {
    fullName: string;
    preferredName: string | null;
    gender: string | null;
    yearOfStudy: number | null;
    school: string | null;
    program: string | null;
    phone: string | null;
    bio: string | null;
    avatarUrl: string | null;
  } | null;
  userRoles: { role: { key: string; name: string } }[];
}

export interface LeaderSummary {
  id: string;
  email: string;
  status: string;
  fullName: string;
  preferredName: string | null;
  gender: string | null;
  yearOfStudy: number | null;
  school: string | null;
  program: string | null;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isExecutive: boolean;
  executiveRole: { key: string; name: string } | null;
  canManage: boolean;
}

function serialiseLeader(user: LeaderWithRelations, canManage: boolean): LeaderSummary {
  const roleKeys = user.userRoles.map((ur) => ur.role.key);
  const isExecutive = roleKeys.some((k) => k !== "LEADER");
  const executiveRole = user.userRoles.find((ur) => ur.role.key !== "LEADER")?.role;
  return {
    id: user.id,
    email: user.email,
    status: user.status,
    fullName: user.profile?.fullName ?? "Unknown",
    preferredName: user.profile?.preferredName ?? null,
    gender: user.profile?.gender ?? null,
    yearOfStudy: user.profile?.yearOfStudy ?? null,
    school: user.profile?.school ?? null,
    program: user.profile?.program ?? null,
    phone: user.profile?.phone ?? null,
    bio: user.profile?.bio ?? null,
    avatarUrl: user.profile?.avatarUrl ?? null,
    isExecutive,
    executiveRole: executiveRole
      ? { key: executiveRole.key, name: executiveRole.name }
      : null,
    canManage,
  };
}

export async function listLeaders(
  query: ListLeadersQuery,
  actor: ResolvedUser,
): Promise<ServiceResult<unknown>> {
  const scope = getLeaderScopeFilter(actor);

  const hasLeadersView =
    actor.permissions.has("leaders.view") ||
    actor.permissions.has("leaders.view.male_y1") ||
    actor.permissions.has("leaders.view.female_y1") ||
    actor.permissions.has("leaders.view.female_y1_readonly") ||
    actor.permissions.has("admin.system");

  if (!hasLeadersView) {
    // Return only the current user as a "leader".
    const self = await db.user.findUnique({
      where: { id: actor.id },
      include: { profile: true, userRoles: { include: { role: true } } },
    });
    return {
      ok: true,
      status: 200,
      data: {
        items: self ? [serialiseLeader(self as LeaderWithRelations, false)] : [],
        total: self ? 1 : 0,
        scope: { restrictedToSelf: true, readOnly: true },
      },
    };
  }

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 12));
  const search = (query.search ?? "").trim();

  const where: Record<string, unknown> = {
    status: "active",
    userRoles: { some: { role: { key: "LEADER" } } },
  };

  if (scope.restrictToCohort) {
    where.profile = {
      ...(scope.gender ? { gender: scope.gender } : {}),
      ...(scope.yearOfStudy ? { yearOfStudy: scope.yearOfStudy } : {}),
    };
  } else {
    where.profile = {
      ...(query.gender ? { gender: query.gender } : {}),
      ...(query.year ? { yearOfStudy: query.year } : {}),
      ...(query.school ? { school: query.school } : {}),
    };
  }

  if (search) {
    where.OR = [
      { email: { contains: search } },
      { profile: { fullName: { contains: search } } },
      { profile: { registrationNumber: { contains: search } } },
      { profile: { phone: { contains: search } } },
    ];
  }

  const [total, leaders] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      include: { profile: true, userRoles: { include: { role: true } } },
      orderBy: { profile: { fullName: "asc" } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    ok: true,
    status: 200,
    data: {
      items: leaders.map((l) =>
        serialiseLeader(l as LeaderWithRelations, !scope.readOnly),
      ),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      scope: {
        restrictedToCohort: scope.restrictToCohort,
        readOnly: scope.readOnly,
        gender: scope.gender ?? null,
        yearOfStudy: scope.yearOfStudy ?? null,
      },
    },
  };
}

export async function getLeader(
  id: string,
  actor: ResolvedUser,
): Promise<ServiceResult<LeaderSummary & { canManage: boolean }>> {
  const scope = getLeaderScopeFilter(actor);

  const user = await db.user.findUnique({
    where: { id },
    include: { profile: true, userRoles: { include: { role: true } } },
  });
  if (!user) {
    return { ok: false, error: "Leader not found.", status: 404 };
  }
  if (user.status !== "active") {
    return { ok: false, error: "Leader not found.", status: 404 };
  }

  // Cohort scope check — if the user is restricted to a cohort, the leader
  // must match it.
  if (scope.restrictToCohort) {
    if (user.id !== actor.id) {
      const gender = user.profile?.gender;
      const year = user.profile?.yearOfStudy;
      if (scope.gender && gender !== scope.gender) {
        return { ok: false, error: "Leader not found.", status: 404 };
      }
      if (scope.yearOfStudy && year !== scope.yearOfStudy) {
        return { ok: false, error: "Leader not found.", status: 404 };
      }
    }
  }

  return {
    ok: true,
    status: 200,
    data: serialiseLeader(user as LeaderWithRelations, !scope.readOnly),
  };
}

// ---------- Authorized updates ----------

export interface UpdateLeaderInput {
  fullName?: string;
  preferredName?: string | null;
  gender?: "male" | "female" | "other";
  yearOfStudy?: number | null;
  school?: string | null;
  program?: string | null;
  phone?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
}

export async function updateLeader(
  id: string,
  input: UpdateLeaderInput,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<LeaderSummary>> {
  const scope = getLeaderScopeFilter(actor);

  // Only non-read-only actors can update.
  if (scope.readOnly) {
    return { ok: false, error: "You do not have permission to update leader records.", status: 403 };
  }

  const user = await db.user.findUnique({
    where: { id },
    include: { profile: true, userRoles: { include: { role: true } } },
  });
  if (!user) {
    return { ok: false, error: "Leader not found.", status: 404 };
  }
  if (user.status !== "active") {
    return { ok: false, error: "Leader not found.", status: 404 };
  }

  // Cohort scope check — can only update leaders in your cohort.
  if (scope.restrictToCohort && user.id !== actor.id) {
    const gender = user.profile?.gender;
    const year = user.profile?.yearOfStudy;
    if (scope.gender && gender !== scope.gender) {
      return { ok: false, error: "Leader not found.", status: 404 };
    }
    if (scope.yearOfStudy && year !== scope.yearOfStudy) {
      return { ok: false, error: "Leader not found.", status: 404 };
    }
  }

  // Build the profile update payload — only include fields that were provided.
  const profileData: Record<string, unknown> = {};
  if (input.fullName !== undefined) profileData.fullName = input.fullName;
  if (input.preferredName !== undefined) profileData.preferredName = input.preferredName;
  if (input.gender !== undefined) profileData.gender = input.gender;
  if (input.yearOfStudy !== undefined) profileData.yearOfStudy = input.yearOfStudy;
  if (input.school !== undefined) profileData.school = input.school;
  if (input.program !== undefined) profileData.program = input.program;
  if (input.phone !== undefined) profileData.phone = input.phone;
  if (input.bio !== undefined) profileData.bio = input.bio;
  if (input.avatarUrl !== undefined) profileData.avatarUrl = input.avatarUrl;

  if (Object.keys(profileData).length === 0) {
    return { ok: true, status: 200, data: serialiseLeader(user as LeaderWithRelations, true) };
  }

  await db.profile.update({
    where: { userId: id },
    data: profileData,
  });

  // Re-fetch to get the updated record.
  const updated = await db.user.findUnique({
    where: { id },
    include: { profile: true, userRoles: { include: { role: true } } },
  });

  if (!updated) {
    return { ok: false, error: "Failed to fetch updated leader.", status: 500 };
  }

  await recordAudit({
    actorId: actor.id,
    action: "leader.update",
    target: `user:${id}`,
    context: {
      email: user.email,
      updatedFields: Object.keys(profileData),
    },
    ip,
  });

  return { ok: true, status: 200, data: serialiseLeader(updated as LeaderWithRelations, true) };
}

// ---------- Archive (soft delete) ----------

export async function archiveLeader(
  id: string,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<{ message: string }>> {
  const scope = getLeaderScopeFilter(actor);

  if (scope.readOnly) {
    return { ok: false, error: "You do not have permission to archive leaders.", status: 403 };
  }

  if (id === actor.id) {
    return { ok: false, error: "You cannot archive your own account.", status: 400 };
  }

  const user = await db.user.findUnique({
    where: { id },
    include: { profile: true, userRoles: { include: { role: true } } },
  });
  if (!user) {
    return { ok: false, error: "Leader not found.", status: 404 };
  }
  if (user.status !== "active") {
    return { ok: false, error: "Leader is not active.", status: 409 };
  }

  // Cohort scope check.
  if (scope.restrictToCohort) {
    const gender = user.profile?.gender;
    const year = user.profile?.yearOfStudy;
    if (scope.gender && gender !== scope.gender) {
      return { ok: false, error: "Leader not found.", status: 404 };
    }
    if (scope.yearOfStudy && year !== scope.yearOfStudy) {
      return { ok: false, error: "Leader not found.", status: 404 };
    }
  }

  // Prevent archiving executives (except by super admin).
  const isExecutive = user.userRoles.some((ur) => ur.role.key !== "LEADER");
  if (isExecutive && !actor.permissions.has("admin.system")) {
    return {
      ok: false,
      error: "Cannot archive an executive. Use the admin panel to change their status.",
      status: 403,
    };
  }

  await db.user.update({
    where: { id },
    data: { status: "deactivated" },
  });

  await recordAudit({
    actorId: actor.id,
    action: "leader.archive",
    target: `user:${id}`,
    context: { email: user.email, fullName: user.profile?.fullName },
    ip,
  });

  return { ok: true, status: 200, data: { message: "Leader archived." } };
}

// ---------- CSV export ----------

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(columns: string[], rows: (string | number | null | undefined)[][]): string {
  const header = columns.map(escapeCsv).join(",");
  const body = rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
  return `${header}\n${body}`;
}

export async function exportLeadersCsv(
  actor: ResolvedUser,
): Promise<ServiceResult<{ csv: string; filename: string }>> {
  const scope = getLeaderScopeFilter(actor);

  const where: Record<string, unknown> = {
    status: "active",
    userRoles: { some: { role: { key: "LEADER" } } },
  };
  if (scope.restrictToCohort) {
    where.profile = {
      ...(scope.gender ? { gender: scope.gender } : {}),
      ...(scope.yearOfStudy ? { yearOfStudy: scope.yearOfStudy } : {}),
    };
  }

  const leaders = await db.user.findMany({
    where,
    include: { profile: true, userRoles: { include: { role: true } } },
    orderBy: { profile: { fullName: "asc" } },
    take: 1000,
  });

  const rows = leaders.map((u) => {
    const roleNames = u.userRoles.map((ur) => ur.role.name).join("; ");
    return [
      u.profile?.fullName ?? "Unknown",
      u.email,
      u.profile?.gender ?? "",
      u.profile?.yearOfStudy ?? "",
      u.profile?.school ?? "",
      u.profile?.program ?? "",
      u.profile?.phone ?? "",
      u.profile?.bio ?? "",
      roleNames,
    ];
  });

  return {
    ok: true,
    status: 200,
    data: {
      csv: toCsv(
        ["Name", "Email", "Gender", "Year", "School", "Program", "Phone", "Bio", "Roles"],
        rows,
      ),
      filename: `leaders-${new Date().toISOString().slice(0, 10)}.csv`,
    },
  };
}
