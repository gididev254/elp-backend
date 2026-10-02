// Zod schemas for the leaders endpoints.

import { z } from "zod";

export const leaderIdParamSchema = z.object({
  id: z.string().min(1),
});

export const listLeadersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
  search: z.string().trim().optional(),
  year: z.coerce.number().int().min(1).max(6).optional(),
  school: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
});

// PATCH /api/leaders/:id — partial profile update. All fields optional.
export const updateLeaderSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  preferredName: z.string().max(100).nullable().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  yearOfStudy: z.coerce.number().int().min(1).max(6).nullable().optional(),
  school: z.string().max(200).nullable().optional(),
  program: z.string().max(200).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export type ListLeadersQuery = z.infer<typeof listLeadersQuerySchema>;
export type UpdateLeaderInput = z.infer<typeof updateLeaderSchema>;
