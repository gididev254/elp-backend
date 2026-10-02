// Zod schemas for concerns endpoints.

import { z } from "zod";

export const COHORTS = ["male_y1", "female_y1"] as const;
export const CONCERN_STATUSES = [
  "open",
  "acknowledged",
  "resolved",
  "closed",
] as const;

export const createConcernSchema = z.object({
  title: z.string().min(3).max(160),
  body: z.string().min(5).max(5000),
  cohort: z.enum(COHORTS),
});

export const updateConcernStatusSchema = z.object({
  status: z.enum(CONCERN_STATUSES),
});

export type CreateConcernInput = z.infer<typeof createConcernSchema>;
export type UpdateConcernStatusInput = z.infer<typeof updateConcernStatusSchema>;
