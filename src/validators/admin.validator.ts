// Zod schemas for admin endpoints.

import { z } from "zod";

export const adminListUsersQuerySchema = z.object({
  status: z
    .enum(["pending", "active", "suspended", "deactivated"])
    .optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().optional(),
});

export const assignRoleSchema = z.object({
  roleKey: z.string().min(1, "roleKey is required.").max(64),
});

export type AdminListUsersQuery = z.infer<typeof adminListUsersQuerySchema>;
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
