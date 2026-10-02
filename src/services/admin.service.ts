// Admin service — user administration endpoints.
//   - list users (admin.users)
//   - approve / reject user (admin.users)
//   - update user status (admin.users)
//   - role assignment / removal (admin.users)
//
// Mirrors the frontend `/api/admin/users/*` route handlers. For list/approve/
// status we re-use `users.service.ts` (same logic) — admin routes simply expose
// a parallel mount point. Reject + role management are implemented here.

import { db } from "../config/database";
import { recordAudit } from "../utils/logger";
import { invalidateUserCache } from "./auth.service";
import {
  approveUser as usersApproveUser,
  listUsers as usersListUsers,
  updateUserStatus as usersUpdateUserStatus,
  type ListUsersOptions,
} from "./users.service";
import type { ResolvedUser, ServiceResult } from "../types/auth";

// Re-export so the admin controller has a single import surface.
export const listUsers = usersListUsers;
export const approveUser = usersApproveUser;
export const updateUserStatus = usersUpdateUserStatus;

export async function rejectUser(
  id: string,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<{ message: string }>> {
  const user = await db.user.findUnique({ where: { id } });
  if (!user) {
    return { ok: false, error: "User not found.", status: 404 };
  }
  if (user.status !== "pending") {
    return {
      ok: false,
      error: "Only pending registrations can be rejected.",
      status: 409,
    };
  }

  await db.user.update({
    where: { id },
    data: { status: "deactivated" },
  });

  invalidateUserCache(id);

  await recordAudit({
    actorId: actor.id,
    action: "user.reject",
    target: `user:${id}`,
    context: { email: user.email },
    ip,
  });

  return { ok: true, status: 200, data: { message: "Registration rejected." } };
}

// ---------------------------------------------------------------------------
// Role assignment / removal
// ---------------------------------------------------------------------------

interface RoleWithPermissions {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  isExecutive: boolean;
  isSystem: boolean;
  permissions: unknown[];
}

function serialiseRole(
  r: RoleWithPermissions,
  assignedAt?: Date,
): {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  isExecutive: boolean;
  isSystem: boolean;
  permissionsCount: number;
  assignedAt: string | null;
} {
  return {
    id: r.id,
    key: r.key,
    name: r.name,
    description: r.description,
    category: r.category,
    isExecutive: r.isExecutive,
    isSystem: r.isSystem,
    permissionsCount: r.permissions.length,
    assignedAt: assignedAt ? assignedAt.toISOString() : null,
  };
}

export async function listUserRoles(
  id: string,
): Promise<ServiceResult<unknown>> {
  const user = await db.user.findUnique({
    where: { id },
    include: {
      profile: { select: { fullName: true } },
      userRoles: {
        include: { role: { include: { permissions: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!user) {
    return { ok: false, error: "User not found.", status: 404 };
  }

  return {
    ok: true,
    status: 200,
    data: {
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
        fullName: user.profile?.fullName ?? "Unknown",
      },
      roles: user.userRoles.map((ur) =>
        serialiseRole(ur.role as RoleWithPermissions, ur.createdAt),
      ),
    },
  };
}

export async function assignRole(
  id: string,
  roleKey: string,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<unknown>> {
  if (id === actor.id) {
    return {
      ok: false,
      error:
        "You cannot modify your own role assignments via this endpoint.",
      status: 400,
    };
  }

  if (roleKey === "LEADER") {
    return {
      ok: false,
      error:
        "LEADER is the automatic base role for every account and cannot be assigned or removed here.",
      status: 403,
    };
  }
  if (roleKey === "SUPER_ADMIN") {
    return {
      ok: false,
      error:
        "SUPER_ADMIN is a restricted role and can only be created via the database seed.",
      status: 403,
    };
  }

  const [user, role] = await Promise.all([
    db.user.findUnique({
      where: { id },
      include: { profile: { select: { fullName: true } } },
    }),
    db.role.findUnique({
      where: { key: roleKey },
      include: { permissions: true },
    }),
  ]);
  if (!user) return { ok: false, error: "User not found.", status: 404 };
  if (!role) return { ok: false, error: `Role "${roleKey}" not found.`, status: 404 };

  const existing = await db.userRole.findUnique({
    where: { userId_roleId: { userId: id, roleId: role.id } },
  });
  if (existing) {
    return {
      ok: false,
      error: "This role is already assigned to the user.",
      status: 409,
    };
  }

  await db.userRole.create({ data: { userId: id, roleId: role.id } });
  invalidateUserCache(id);

  await db.notification
    .create({
      data: {
        userId: id,
        type: "role_change",
        title: "New role assigned",
        body: `You have been assigned the role of ${role.name}.`,
        link: "/dashboard",
      },
    })
    .catch(() => undefined);

  await recordAudit({
    actorId: actor.id,
    action: "role.assign",
    target: `user:${id}`,
    context: {
      email: user.email,
      roleKey: role.key,
      roleName: role.name,
      category: role.category,
      isExecutive: role.isExecutive,
    },
    ip,
  });

  return {
    ok: true,
    status: 200,
    data: {
      message: "Role assigned.",
      role: serialiseRole(role as RoleWithPermissions),
    },
  };
}

export async function removeRole(
  id: string,
  roleKey: string,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<unknown>> {
  if (id === actor.id) {
    return {
      ok: false,
      error:
        "You cannot modify your own role assignments via this endpoint.",
      status: 400,
    };
  }

  if (roleKey === "LEADER") {
    return {
      ok: false,
      error:
        "LEADER is the automatic base role and cannot be removed from a user.",
      status: 403,
    };
  }
  if (roleKey === "SUPER_ADMIN") {
    return {
      ok: false,
      error:
        "SUPER_ADMIN cannot be removed via this endpoint. Use the database seed script to manage super-admin accounts.",
      status: 403,
    };
  }

  const [user, role] = await Promise.all([
    db.user.findUnique({
      where: { id },
      include: { profile: { select: { fullName: true } } },
    }),
    db.role.findUnique({
      where: { key: roleKey },
      include: { permissions: true },
    }),
  ]);
  if (!user) return { ok: false, error: "User not found.", status: 404 };
  if (!role) return { ok: false, error: `Role "${roleKey}" not found.`, status: 404 };

  const existing = await db.userRole.findUnique({
    where: { userId_roleId: { userId: id, roleId: role.id } },
  });
  if (!existing) {
    return {
      ok: false,
      error: "The user does not currently hold this role.",
      status: 404,
    };
  }

  // Soft warning (does NOT block): if this user is the ONLY one holding this
  // executive role, removing it would leave the role unstaffed.
  let warning: string | null = null;
  if (role.isExecutive) {
    const holders = await db.userRole.count({ where: { roleId: role.id } });
    if (holders <= 1) {
      warning = `Warning: this was the only member holding the "${role.name}" role. The role is now unstaffed.`;
    }
  }

  await db.userRole.delete({ where: { id: existing.id } });
  invalidateUserCache(id);

  await db.notification
    .create({
      data: {
        userId: id,
        type: "role_change",
        title: "Role removed",
        body: `The role of ${role.name} has been removed from your account.`,
        link: "/dashboard",
      },
    })
    .catch(() => undefined);

  await recordAudit({
    actorId: actor.id,
    action: "role.remove",
    target: `user:${id}`,
    context: {
      email: user.email,
      roleKey: role.key,
      roleName: role.name,
      category: role.category,
      isExecutive: role.isExecutive,
      warning: warning ?? undefined,
    },
    ip,
  });

  return {
    ok: true,
    status: 200,
    data: { message: "Role removed.", roleKey: role.key, warning },
  };
}

// Re-export the list options type so the controller has a clean import.
export type { ListUsersOptions };
