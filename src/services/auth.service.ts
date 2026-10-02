// Auth service — user resolution, login, registration, session lookup.
// Mirrors the logic in the frontend's `lib/rbac/server.ts` and
// `app/api/auth/register/route.ts` so the two surfaces behave identically.

import { db } from "../config/database";
import { env } from "../config/env";
import { hashPassword, comparePassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import type { ResolvedUser, ServiceResult } from "../types/auth";

// ---------- In-request user cache (avoids repeated DB hits) ----------
const userCache = new Map<string, { user: ResolvedUser; expires: number }>();
const TTL_MS = 30_000; // 30s

export function invalidateUserCache(userId: string): void {
  userCache.delete(userId);
}

// Resolve a user (with their full permission set) from the DB.
export async function resolveUser(
  userId: string | undefined | null,
): Promise<ResolvedUser | null> {
  if (!userId) return null;

  const cached = userCache.get(userId);
  if (cached && cached.expires > Date.now()) return cached.user;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      status: true,
      profile: { select: { fullName: true, preferredName: true } },
      userRoles: {
        include: {
          role: {
            include: { permissions: { include: { permission: true } } },
          },
        },
      },
    },
  });
  if (!user) return null;

  const roleKeys = user.userRoles.map((ur) => ur.role.key);
  const permissions = new Set<string>();
  for (const ur of user.userRoles) {
    for (const rp of ur.role.permissions) {
      permissions.add(rp.permission.key);
    }
  }

  // Determine primary role: prefer SUPER_ADMIN > executive > LEADER.
  let primaryRole: string | null = null;
  if (roleKeys.includes("SUPER_ADMIN")) {
    primaryRole = "SUPER_ADMIN";
  } else {
    const execRoles = [
      "PRESIDENT",
      "VICE_PRESIDENT",
      "SECRETARY_GENERAL",
      "ORGANIZING_SECRETARY",
      "TREASURER",
      "COMMUNICATIONS_DIRECTOR",
      "MENTORSHIP_COORDINATOR",
      "ALUMNI_MANAGER",
      "MALE_Y1_REPRESENTATIVE",
      "FEMALE_Y1_REPRESENTATIVE",
      "ASSISTANT_FEMALE_Y1_REPRESENTATIVE",
    ];
    primaryRole = execRoles.find((r) => roleKeys.includes(r)) ?? "LEADER";
  }

  const resolved: ResolvedUser = {
    id: user.id,
    email: user.email,
    name: user.profile?.preferredName || user.profile?.fullName || null,
    roleKeys,
    primaryRole,
    permissions,
    status: user.status,
  };

  userCache.set(userId, { user: resolved, expires: Date.now() + TTL_MS });
  return resolved;
}

// Permission helpers (mirror rbac/server.ts).
export function hasPermission(user: ResolvedUser | null, permission: string): boolean {
  if (!user) return false;
  if (user.status !== "active") return false;
  if (user.permissions.has("admin.system")) return true; // super admin bypass
  return user.permissions.has(permission);
}

export function hasAnyPermission(
  user: ResolvedUser | null,
  ...perms: string[]
): boolean {
  if (!user) return false;
  if (user.status !== "active") return false;
  if (user.permissions.has("admin.system")) return true;
  return perms.some((p) => user.permissions.has(p));
}

// ---------- Login ----------
export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    primaryRole: string | null;
    roleKeys: string[];
    status: string;
    permissions: string[];
  };
}

export async function login(
  input: LoginInput,
): Promise<ServiceResult<LoginResult>> {
  const email = input.email.trim().toLowerCase();
  if (!email || !input.password) {
    return { ok: false, error: "Email and password are required.", status: 400 };
  }

  const user = await db.user.findUnique({
    where: { email },
    include: { profile: true },
  });
  if (!user) {
    // Do not leak that the email does not exist.
    return { ok: false, error: "Invalid email or password.", status: 401 };
  }

  const passwordOk = await comparePassword(input.password, user.passwordHash);
  if (!passwordOk) {
    return { ok: false, error: "Invalid email or password.", status: 401 };
  }

  if (user.status !== "active") {
    return {
      ok: false,
      error: `Account not active (status: ${user.status}). Contact an administrator.`,
      status: 403,
    };
  }

  const resolved = await resolveUser(user.id);
  if (!resolved) {
    return { ok: false, error: "Unable to resolve user account.", status: 500 };
  }

  const token = signToken({
    sub: resolved.id,
    email: resolved.email,
    role: resolved.primaryRole,
    status: resolved.status,
  });

  return {
    ok: true,
    status: 200,
    data: {
      token,
      user: {
        id: resolved.id,
        email: resolved.email,
        name: resolved.name,
        primaryRole: resolved.primaryRole,
        roleKeys: resolved.roleKeys,
        status: resolved.status,
        permissions: Array.from(resolved.permissions),
      },
    },
  };
}

// ---------- Register (hybrid controlled) ----------
export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  gender: "male" | "female" | "other";
  yearOfStudy: number;
  school: string;
  program: string;
  phone?: string;
}

export async function register(
  input: RegisterInput,
): Promise<ServiceResult<{ userId: string; status: string; message: string }>> {
  const email = input.email.trim().toLowerCase();

  // Domain gate
  if (!email.endsWith(`@${env.ALLOWED_DOMAIN}`)) {
    return {
      ok: false,
      error: `Registration is restricted to @${env.ALLOWED_DOMAIN} email addresses.`,
      status: 422,
    };
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return {
      ok: false,
      error: "An account with this email already exists.",
      status: 409,
    };
  }

  const passwordHash = await hashPassword(input.password);
  const leaderRole = await db.role.findUnique({ where: { key: "LEADER" } });
  if (!leaderRole) {
    return {
      ok: false,
      error: "System not initialised. Please run db:seed.",
      status: 500,
    };
  }

  const user = await db.user.create({
    data: {
      email,
      passwordHash,
      status: "pending",
      profile: {
        create: {
          fullName: input.fullName,
          preferredName: input.fullName.split(" ")[0],
          gender: input.gender,
          yearOfStudy: input.yearOfStudy,
          school: input.school,
          program: input.program,
          phone: input.phone,
          avatarUrl:
            input.gender === "female"
              ? "/images/avatars/avatar-2.png"
              : "/images/avatars/avatar-1.png",
        },
      },
      userRoles: { create: { roleId: leaderRole.id } },
    },
  });

  return {
    ok: true,
    status: 201,
    data: {
      userId: user.id,
      status: user.status,
      message:
        "Registration received. Your account is now pending administrator approval. " +
        "You will be able to sign in once an executive approves your account.",
    },
  };
}

// ---------- Session lookup (current user) ----------
export async function getSession(
  userId: string,
): Promise<ServiceResult<LoginResult["user"]>> {
  const resolved = await resolveUser(userId);
  if (!resolved) {
    return { ok: false, error: "User not found.", status: 404 };
  }
  return {
    ok: true,
    status: 200,
    data: {
      id: resolved.id,
      email: resolved.email,
      name: resolved.name,
      primaryRole: resolved.primaryRole,
      roleKeys: resolved.roleKeys,
      status: resolved.status,
      permissions: Array.from(resolved.permissions),
    },
  };
}
