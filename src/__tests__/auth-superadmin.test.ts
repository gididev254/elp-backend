import { test, expect, describe } from "bun:test";
import {
  hasPermission,
  hasAnyPermission,
  resolveUser,
} from "../services/auth.service";
import {
  ROLES,
  resolveRolePermissions,
  getRoleDefinition,
} from "../permissions/rolePermissions";
import { PERMISSIONS } from "../permissions/permissions";

function makeUser(overrides: {
  status?: string;
  permissions: string[];
}) {
  return {
    id: "user-1",
    email: "test@embuni.ac.ke",
    name: "Test User",
    roleKeys: [],
    primaryRole: null,
    permissions: new Set(overrides.permissions),
    status: overrides.status ?? "active",
  };
}

// ---------- Super Admin role definition ----------

describe("Super Admin role definition", () => {
  test("SUPER_ADMIN exists in ROLES", () => {
    const role = getRoleDefinition("SUPER_ADMIN");
    expect(role).toBeDefined();
    expect(role?.key).toBe("SUPER_ADMIN");
  });

  test("SUPER_ADMIN has isSystem: true", () => {
    const role = getRoleDefinition("SUPER_ADMIN");
    expect(role?.isSystem).toBe(true);
  });

  test("SUPER_ADMIN has every permission in the catalogue", () => {
    const perms = resolveRolePermissions("SUPER_ADMIN");
    expect(perms.size).toBe(PERMISSIONS.length);
    for (const p of PERMISSIONS) {
      expect(perms.has(p.key)).toBe(true);
    }
  });

  test("SUPER_ADMIN has admin.system (bypass flag)", () => {
    expect(resolveRolePermissions("SUPER_ADMIN").has("admin.system")).toBe(true);
  });

  test("SUPER_ADMIN has admin.users and admin.roles", () => {
    const perms = resolveRolePermissions("SUPER_ADMIN");
    expect(perms.has("admin.users")).toBe(true);
    expect(perms.has("admin.roles")).toBe(true);
  });

  test("SUPER_ADMIN has audit.view", () => {
    expect(resolveRolePermissions("SUPER_ADMIN").has("audit.view")).toBe(true);
  });

  test("no other role has admin.system", () => {
    for (const role of ROLES) {
      if (role.key === "SUPER_ADMIN") continue;
      expect(resolveRolePermissions(role.key).has("admin.system")).toBe(false);
    }
  });

  test("no other role has admin.users", () => {
    for (const role of ROLES) {
      if (role.key === "SUPER_ADMIN") continue;
      expect(resolveRolePermissions(role.key).has("admin.users")).toBe(false);
    }
  });

  test("no other role has admin.roles", () => {
    for (const role of ROLES) {
      if (role.key === "SUPER_ADMIN") continue;
      expect(resolveRolePermissions(role.key).has("admin.roles")).toBe(false);
    }
  });
});

// ---------- hasPermission with Super Admin ----------

describe("hasPermission — Super Admin bypass", () => {
  test("SUPER_ADMIN has admin.system allows any permission", () => {
    const user = makeUser({
      status: "active",
      permissions: ["admin.system"],
    });
    const allPerms = PERMISSIONS.map((p) => p.key);
    for (const perm of allPerms) {
      expect(hasPermission(user, perm)).toBe(true);
    }
  });

  test("inactive Super Admin cannot bypass", () => {
    const user = makeUser({
      status: "inactive",
      permissions: ["admin.system"],
    });
    expect(hasPermission(user, "admin.users")).toBe(false);
    expect(hasPermission(user, "audit.view")).toBe(false);
  });

  test("non-Super Admin without the permission is denied", () => {
    const user = makeUser({
      status: "active",
      permissions: ["dashboard.view"],
    });
    expect(hasPermission(user, "admin.system")).toBe(false);
    expect(hasPermission(user, "audit.view")).toBe(false);
  });
});

// ---------- hasAnyPermission with Super Admin ----------

describe("hasAnyPermission — Super Admin bypass", () => {
  test("SUPER_ADMIN has admin.system allows any combination", () => {
    const user = makeUser({
      status: "active",
      permissions: ["admin.system"],
    });
    expect(hasAnyPermission(user, "admin.users", "admin.roles")).toBe(true);
    expect(hasAnyPermission(user, "finance.manage", "audit.view")).toBe(true);
    expect(hasAnyPermission(user, "leaders.manage")).toBe(true);
    expect(hasAnyPermission(user, "nonexistent.perm")).toBe(true);
  });

  test("non-Super Admin without any of the perms is denied", () => {
    const user = makeUser({
      status: "active",
      permissions: ["dashboard.view"],
    });
    expect(hasAnyPermission(user, "admin.users", "audit.view")).toBe(false);
  });
});

// ---------- resolveUser null handling ----------

describe("resolveUser", () => {
  test("returns null for undefined userId", async () => {
    const user = await resolveUser(undefined);
    expect(user).toBeNull();
  });

  test("returns null for null userId", async () => {
    const user = await resolveUser(null);
    expect(user).toBeNull();
  });

  test("returns null for empty string userId", async () => {
    const user = await resolveUser("");
    expect(user).toBeNull();
  });
});

// ---------- Super Admin exclusive permission checks ----------

describe("Super Admin permission exclusivity", () => {
  test("SUPER_ADMIN can access admin users route (admin.users)", () => {
    expect(resolveRolePermissions("SUPER_ADMIN").has("admin.users")).toBe(true);
  });

  test("SUPER_ADMIN can access admin roles route (admin.roles)", () => {
    expect(resolveRolePermissions("SUPER_ADMIN").has("admin.roles")).toBe(true);
  });

  test("SUPER_ADMIN can view audit logs (audit.view)", () => {
    expect(resolveRolePermissions("SUPER_ADMIN").has("audit.view")).toBe(true);
  });

  test("SUPER_ADMIN has system administration (admin.system)", () => {
    expect(resolveRolePermissions("SUPER_ADMIN").has("admin.system")).toBe(true);
  });

  test("LEADER does NOT have admin.* permissions", () => {
    const perms = resolveRolePermissions("LEADER");
    expect(perms.has("admin.users")).toBe(false);
    expect(perms.has("admin.roles")).toBe(false);
    expect(perms.has("admin.system")).toBe(false);
  });

  test("PRESIDENT does NOT have admin.* permissions", () => {
    const perms = resolveRolePermissions("PRESIDENT");
    expect(perms.has("admin.users")).toBe(false);
    expect(perms.has("admin.roles")).toBe(false);
    expect(perms.has("admin.system")).toBe(false);
  });
});
