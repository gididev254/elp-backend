// Zod schemas for user admin endpoints.

import { z } from "zod";

export const userIdParamSchema = z.object({
  id: z.string().min(1),
});

export const userStatusSchema = z.object({
  status: z.enum(["active", "pending", "suspended", "deactivated"]),
});

export const listUsersQuerySchema = z.object({
  status: z
    .enum(["pending", "active", "suspended", "deactivated"])
    .optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().optional(),
});

// Self-service password change (used by /api/users/me/password).
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPath: z.string().min(8, "New password must be at least 8 characters."),
  confirmPath: z.string().min(1, "Please confirm your new password."),
}).refine((d) => d.newPath === d.confirmPath, {
  message: "New password and confirmation do not match.",
  path: ["confirmPath"],
});

export type UserIdParam = z.infer<typeof userIdParamSchema>;
export type UserStatusInput = z.infer<typeof userStatusSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
