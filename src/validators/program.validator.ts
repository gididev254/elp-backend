// Zod schemas for programs endpoints.

import { z } from "zod";

export const PROGRAM_CATEGORIES = [
  "mentorship",
  "leadership",
  "community",
  "career",
  "academic",
] as const;

export const programIdParamSchema = z.object({
  id: z.string().min(1),
});

export const listProgramsQuerySchema = z.object({
  status: z.enum(["draft", "published", "archived", "all"]).optional(),
  category: z.string().optional(),
  search: z.string().trim().optional(),
});

export const createProgramSchema = z.object({
  title: z.string().min(3).max(160),
  summary: z.string().min(5).max(400),
  description: z.string().min(5).max(10000),
  category: z.enum(PROGRAM_CATEGORIES).optional(),
  coverUrl: z.union([z.string().url(), z.literal("")]).optional(),
  slug: z.string().min(3).max(160).optional(),
});

export const patchProgramSchema = z.object({
  title: z.string().min(3).max(160).optional(),
  summary: z.string().min(5).max(400).optional(),
  description: z.string().min(5).max(10000).optional(),
  category: z.enum(PROGRAM_CATEGORIES).nullable().optional(),
  coverUrl: z.union([z.string().url(), z.literal("")]).nullable().optional(),
  slug: z.string().min(3).max(160).optional(),
});

export type CreateProgramInput = z.infer<typeof createProgramSchema>;
export type PatchProgramInput = z.infer<typeof patchProgramSchema>;
