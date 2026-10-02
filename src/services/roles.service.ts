// Roles & permissions catalogue service.
// Returns the static role/permission catalogue (mirrors the frontend RBAC
// files) plus the live DB-backed roles with their attached permissions.

import { db } from "../config/database";
import { ROLES } from "../permissions/rolePermissions";
import { PERMISSIONS } from "../permissions/permissions";
import type { ServiceResult } from "../types/auth";

export async function listRoles(): Promise<
  ServiceResult<{
    items: Array<{
      key: string;
      name: string;
      description: string | null;
      category: string;
      isExecutive: boolean;
      isSystem: boolean;
      permissionCount: number;
    }>;
  }>
> {
  // Merge the static catalogue (source of truth) with the DB row IDs.
  const dbRoles = await db.role.findMany({
    include: { _count: { select: { permissions: true } } },
  });
  const byKey = new Map(dbRoles.map((r) => [r.key, r]));

  return {
    ok: true,
    status: 200,
    data: {
      items: ROLES.map((r) => ({
        key: r.key,
        name: r.name,
        description: r.description,
        category: r.category,
        isExecutive: r.isExecutive,
        isSystem: r.isSystem ?? false,
        permissionCount:
          byKey.get(r.key)?._count.permissions ?? r.permissions.length,
      })),
    },
  };
}

export async function getRole(
  idOrKey: string,
): Promise<
  ServiceResult<{
    id: string;
    key: string;
    name: string;
    description: string | null;
    category: string;
    isExecutive: boolean;
    isSystem: boolean;
    permissions: Array<{ key: string; name: string; module: string; action: string }>;
  }>
> {
  const role = await db.role.findFirst({
    where: { OR: [{ id: idOrKey }, { key: idOrKey }] },
    include: {
      permissions: { include: { permission: true } },
    },
  });
  if (!role) {
    return { ok: false, error: "Role not found.", status: 404 };
  }
  return {
    ok: true,
    status: 200,
    data: {
      id: role.id,
      key: role.key,
      name: role.name,
      description: role.description,
      category: role.category,
      isExecutive: role.isExecutive,
      isSystem: role.isSystem,
      permissions: role.permissions.map((rp) => ({
        key: rp.permission.key,
        name: rp.permission.name,
        module: rp.permission.module,
        action: rp.permission.action,
      })),
    },
  };
}

export async function listPermissions(): Promise<
  ServiceResult<{
    items: Array<{
      key: string;
      name: string;
      description: string | null;
      module: string;
      action: string;
      scope: string | null;
    }>;
  }>
> {
  // Pull from the DB (the source the running backend actually enforces).
  const perms = await db.permission.findMany({
    orderBy: [{ module: "asc" }, { action: "asc" }, { scope: "asc" }],
  });
  if (perms.length === 0) {
    // Fallback to the static catalogue if the DB hasn't been seeded.
    return {
      ok: true,
      status: 200,
      data: {
        items: PERMISSIONS.map((p) => ({
          key: p.key,
          name: p.name,
          description: null,
          module: p.module,
          action: p.action,
          scope: ("scope" in p ? (p as { scope?: string }).scope : null) ?? null,
        })),
      },
    };
  }
  return {
    ok: true,
    status: 200,
    data: {
      items: perms.map((p) => ({
        key: p.key,
        name: p.name,
        description: p.description,
        module: p.module,
        action: p.action,
        scope: p.scope,
      })),
    },
  };
}
