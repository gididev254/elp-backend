import { test, expect, describe } from "bun:test";
import {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
} from "../middleware/authorize";
import type { Request, Response, NextFunction } from "express";
import type { ResolvedUser } from "../types/auth";
import { hasPermission, hasAnyPermission } from "../services/auth.service";

function makeMockUser(overrides: Partial<ResolvedUser>): ResolvedUser {
  return {
    id: "user-1",
    email: "test@embuni.ac.ke",
    name: "Test User",
    roleKeys: [],
    primaryRole: null,
    permissions: new Set(),
    status: "active",
    ...overrides,
  };
}

function mockRequest(user: ResolvedUser | null): Request {
  return { user } as unknown as Request;
}

function mockResponse(): Response & { statusCode?: number; body?: unknown } {
  const result: Response & { statusCode?: number; body?: unknown } = {
    statusCode: undefined,
    body: undefined,
  };
  result.status = ((code: number) => ({
    json: (body: unknown) => {
      result.statusCode = code;
      result.body = body;
      return result;
    },
  })) as unknown as Response["status"];
  return result;
}

function mockNext() {
  let called = false;
  return {
    fn: () => { called = true; },
    wasCalled: () => called,
  };
}

// ---------- Pure permission helpers ----------

describe("hasPermission", () => {
  test("returns false for null user", () => {
    expect(hasPermission(null, "admin.system")).toBe(false);
  });

  test("returns false for inactive Super Admin", () => {
    const user = makeMockUser({
      status: "inactive",
      permissions: new Set(["admin.system", "dashboard.view"]),
    });
    expect(hasPermission(user, "admin.system")).toBe(false);
    expect(hasPermission(user, "dashboard.view")).toBe(false);
  });

  test("returns true for Super Admin (admin.system bypass) on any permission", () => {
    const user = makeMockUser({
      permissions: new Set(["admin.system"]),
    });
    expect(hasPermission(user, "admin.users")).toBe(true);
    expect(hasPermission(user, "admin.roles")).toBe(true);
    expect(hasPermission(user, "audit.view")).toBe(true);
    expect(hasPermission(user, "leaders.manage")).toBe(true);
    expect(hasPermission(user, "finance.manage")).toBe(true);
    expect(hasPermission(user, "concerns.manage")).toBe(true);
  });

  test("returns true when user has the exact permission", () => {
    const user = makeMockUser({ permissions: new Set(["audit.view"]) });
    expect(hasPermission(user, "audit.view")).toBe(true);
  });

  test("returns false when user lacks the permission", () => {
    const user = makeMockUser({ permissions: new Set(["dashboard.view"]) });
    expect(hasPermission(user, "audit.view")).toBe(false);
  });
});

describe("hasAnyPermission", () => {
  test("returns false for null user", () => {
    expect(hasAnyPermission(null, "admin.system")).toBe(false);
  });

  test("returns true for Super Admin regardless of requested perms", () => {
    const user = makeMockUser({ permissions: new Set(["admin.system"]) });
    expect(hasAnyPermission(user, "admin.users", "admin.roles")).toBe(true);
    expect(hasAnyPermission(user, "finance.manage", "audit.view")).toBe(true);
    expect(hasAnyPermission(user, "leaders.manage")).toBe(true);
  });

  test("returns true when user has any one of the listed permissions", () => {
    const user = makeMockUser({ permissions: new Set(["audit.view"]) });
    expect(hasAnyPermission(user, "admin.users", "audit.view")).toBe(true);
  });

  test("returns false when user has none of the listed permissions", () => {
    const user = makeMockUser({ permissions: new Set(["dashboard.view"]) });
    expect(hasAnyPermission(user, "admin.users", "audit.view")).toBe(false);
  });
});

// ---------- Middleware factories ----------

describe("requirePermission", () => {
  test("allows Super Admin through (admin.system bypass)", () => {
    const req = mockRequest(makeMockUser({ permissions: new Set(["admin.system"]) }));
    const res = mockResponse();
    const next = mockNext();
    const middleware = requirePermission("admin.users");
    middleware(req, mockResponse() as unknown as Response, next.fn as NextFunction);
    expect(next.wasCalled()).toBe(true);
    expect(res.statusCode).toBeUndefined();
  });

  test("allows when user has the required permission", () => {
    const req = mockRequest(makeMockUser({ permissions: new Set(["audit.view"]) }));
    const res = mockResponse();
    const next = mockNext();
    const middleware = requirePermission("audit.view");
    middleware(req, res as unknown as Response, next.fn as NextFunction);
    expect(next.wasCalled()).toBe(true);
  });

  test("denies when user lacks the required permission", () => {
    const req = mockRequest(makeMockUser({ permissions: new Set(["dashboard.view"]) }));
    const res = mockResponse();
    const next = mockNext();
    const middleware = requirePermission("audit.view");
    middleware(req, res as unknown as Response, next.fn as NextFunction);
    expect(next.wasCalled()).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  test("denies when user is null (401)", () => {
    const req = mockRequest(null);
    const res = mockResponse();
    const next = mockNext();
    const middleware = requirePermission("admin.system");
    middleware(req, res as unknown as Response, next.fn as NextFunction);
    expect(next.wasCalled()).toBe(false);
    expect(res.statusCode).toBe(401);
  });
});

describe("requireAnyPermission", () => {
  test("allows Super Admin through (admin.system bypass)", () => {
    const req = mockRequest(makeMockUser({ permissions: new Set(["admin.system"]) }));
    const res = mockResponse();
    const next = mockNext();
    const middleware = requireAnyPermission("admin.users", "admin.roles");
    middleware(req, res as unknown as Response, next.fn as NextFunction);
    expect(next.wasCalled()).toBe(true);
  });

  test("allows when user has any one permission", () => {
    const req = mockRequest(makeMockUser({ permissions: new Set(["audit.view"]) }));
    const res = mockResponse();
    const next = mockNext();
    const middleware = requireAnyPermission("admin.users", "audit.view");
    middleware(req, res as unknown as Response, next.fn as NextFunction);
    expect(next.wasCalled()).toBe(true);
  });

  test("denies when user has none of the permissions", () => {
    const req = mockRequest(makeMockUser({ permissions: new Set(["dashboard.view"]) }));
    const res = mockResponse();
    const next = mockNext();
    const middleware = requireAnyPermission("admin.users", "audit.view");
    middleware(req, res as unknown as Response, next.fn as NextFunction);
    expect(next.wasCalled()).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  test("denies when user is null (401)", () => {
    const req = mockRequest(null);
    const res = mockResponse();
    const next = mockNext();
    const middleware = requireAnyPermission("admin.system");
    middleware(req, res as unknown as Response, next.fn as NextFunction);
    expect(next.wasCalled()).toBe(false);
    expect(res.statusCode).toBe(401);
  });
});

describe("requireAllPermissions", () => {
  test("allows Super Admin through (admin.system bypass)", () => {
    const req = mockRequest(makeMockUser({ permissions: new Set(["admin.system"]) }));
    const res = mockResponse();
    const next = mockNext();
    const middleware = requireAllPermissions("admin.users", "audit.view", "finance.manage");
    middleware(req, res as unknown as Response, next.fn as NextFunction);
    expect(next.wasCalled()).toBe(true);
  });

  test("allows when user has all required permissions", () => {
    const req = mockRequest(
      makeMockUser({ permissions: new Set(["admin.users", "audit.view", "finance.manage"]) }),
    );
    const res = mockResponse();
    const next = mockNext();
    const middleware = requireAllPermissions("admin.users", "audit.view", "finance.manage");
    middleware(req, res as unknown as Response, next.fn as NextFunction);
    expect(next.wasCalled()).toBe(true);
  });

  test("denies when user is missing one permission", () => {
    const req = mockRequest(
      makeMockUser({ permissions: new Set(["admin.users", "audit.view"]) }),
    );
    const res = mockResponse();
    const next = mockNext();
    const middleware = requireAllPermissions("admin.users", "audit.view", "finance.manage");
    middleware(req, res as unknown as Response, next.fn as NextFunction);
    expect(next.wasCalled()).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  test("denies when user is null (401)", () => {
    const req = mockRequest(null);
    const res = mockResponse();
    const next = mockNext();
    const middleware = requireAllPermissions("admin.system");
    middleware(req, res as unknown as Response, next.fn as NextFunction);
    expect(next.wasCalled()).toBe(false);
    expect(res.statusCode).toBe(401);
  });
});
