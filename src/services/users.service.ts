// User administration service — list / approve / status changes.
// Mirrors the frontend `/api/admin/users/*` route handlers.

import { db } from "../config/database";
import { invalidateUserCache } from "./auth.service";
import { recordAudit } from "../utils/logger";
import { hashPassword, comparePassword } from "../utils/password";
import type { ResolvedUser, ServiceResult } from "../types/auth";

export interface ListUsersOptions {
  status?: string;
  take?: number;
  search?: string;
}

export interface UserSummary {
  id: string;
  email: string;
  status: string;
  fullName: string;
  avatarUrl: string | null;
  primaryRole: string;
  primaryRoleName: string;
  createdAt: string;
}

export async function listUsers(
  opts: ListUsersOptions,
): Promise<ServiceResult<{ items: UserSummary[] }>> {
  const where: Record<string, unknown> = {};
  if (opts.status) where.status = opts.status;
  if (opts.search) {
    where.OR = [
      { email: { contains: opts.search } },
      { profile: { fullName: { contains: opts.search } } },
    ];
  }

  const users = await db.user.findMany({
    where,
    include: { profile: true, userRoles: { include: { role: true } } },
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 50,
  });

  return {
    ok: true,
    status: 200,
    data: {
      items: users.map((u) => {
        const exec = u.userRoles.find((ur) => ur.role.key !== "LEADER");
        return {
          id: u.id,
          email: u.email,
          status: u.status,
          fullName: u.profile?.fullName ?? "Unknown",
          avatarUrl: u.profile?.avatarUrl ?? null,
          primaryRole: exec?.role.key ?? "LEADER",
          primaryRoleName: exec?.role.name ?? "Leader",
          createdAt: u.createdAt.toISOString(),
        };
      }),
    },
  };
}

export async function approveUser(
  id: string,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<{ message: string }>> {
  const user = await db.user.findUnique({ where: { id } });
  if (!user) {
    return { ok: false, error: "User not found.", status: 404 };
  }
  if (user.status === "active") {
    return { ok: false, error: "Account is already active.", status: 409 };
  }

  await db.user.update({
    where: { id },
    data: { status: "active", emailVerified: new Date() },
  });

  await db.notification.create({
    data: {
      userId: id,
      type: "system",
      title: "Your account has been approved",
      body: "Welcome to the Embuni Equity Leaders Chapter! You can now sign in to your dashboard.",
      link: "/dashboard",
    },
  });

  invalidateUserCache(id);

  await recordAudit({
    actorId: actor.id,
    action: "user.approve",
    target: `user:${id}`,
    context: { email: user.email },
    ip,
  });

  return { ok: true, status: 200, data: { message: "Account approved." } };
}

export async function updateUserStatus(
  id: string,
  status: "active" | "pending" | "suspended" | "deactivated",
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<{ message: string; status: string }>> {
  if (id === actor.id) {
    return { ok: false, error: "You cannot change your own status.", status: 400 };
  }

  const user = await db.user.findUnique({ where: { id } });
  if (!user) {
    return { ok: false, error: "User not found.", status: 404 };
  }

  // Don't allow suspending/deactivating super admins.
  const targetRoles = await db.userRole.findMany({
    where: { userId: id },
    include: { role: true },
  });
  if (
    targetRoles.some((ur) => ur.role.key === "SUPER_ADMIN") &&
    status !== "active"
  ) {
    return {
      ok: false,
      error: "Cannot suspend or deactivate a Super Administrator.",
      status: 403,
    };
  }

  await db.user.update({ where: { id }, data: { status } });
  invalidateUserCache(id);

  await db.notification
    .create({
      data: {
        userId: id,
        type: "system",
        title: "Account status changed",
        body: `Your account status is now: ${status}.`,
        link: "/dashboard",
      },
    })
    .catch(() => undefined);

  await recordAudit({
    actorId: actor.id,
    action: `user.status.${status}`,
    target: `user:${id}`,
    context: { email: user.email, from: user.status, to: status },
    ip,
  });

  return { ok: true, status: 200, data: { message: "Status updated.", status } };
}

// ---------- Password change (self-service) ----------

export interface ChangePasswordInput {
  currentPassword: string;
  newPath: string;
  confirmPath: string;
}

export interface ChangePasswordResult {
  message: string;
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
  ip?: string,
): Promise<ServiceResult<ChangePasswordResult>> {
  // Confirm new password matches.
  if (input.newPath !== input.confirmPath) {
    return { ok: false, error: "New password and confirmation do not match.", status: 400 };
  }

  // Basic strength check.
  if (input.newPath.length < 8) {
    return { ok: false, error: "New password must be at least 8 characters.", status: 400 };
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { ok: false, error: "User not found.", status: 404 };
  }

  // Verify the current password.
  const currentOk = await comparePassword(input.currentPassword, user.passwordHash);
  if (!currentOk) {
    return { ok: false, error: "Current password is incorrect.", status: 401 };
  }

  // Prevent re-using the same password.
  const sameAsCurrent = await comparePassword(input.newPath, user.passwordHash);
  if (sameAsCurrent) {
    return { ok: false, error: "New password must be different from your current password.", status: 400 };
  }

  const newHash = await hashPassword(input.newPath);
  await db.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
  invalidateUserCache(userId);

  await recordAudit({
    actorId: userId,
    action: "user.password.change",
    target: `user:${userId}`,
    context: { email: user.email },
    ip,
  });

  return { ok: true, status: 200, data: { message: "Password updated." } };
}
