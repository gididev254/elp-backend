// Zod schemas for mentorship endpoints (assignments + sessions).

import { z } from "zod";

export const ASSIGNMENT_STATUSES = [
  "active",
  "completed",
  "paused",
  "cancelled",
] as const;

export const createAssignmentSchema = z.object({
  mentorId: z.string().min(1),
  menteeId: z.string().min(1),
  programId: z.string().min(1).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(ASSIGNMENT_STATUSES).optional(),
});

export const patchAssignmentSchema = z.object({
  notes: z.string().max(2000).nullable().optional(),
  status: z.enum(ASSIGNMENT_STATUSES).optional(),
  programId: z.string().min(1).nullable().optional(),
});

export const createSessionSchema = z.object({
  title: z.string().min(3).max(200),
  notes: z.string().max(5000).optional().nullable(),
  heldAt: z.string().min(8),
});

export const patchSessionSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  notes: z.string().max(5000).nullable().optional(),
  heldAt: z.string().min(8).optional(),
});

export const listAssignmentsQuerySchema = z.object({
  status: z.enum(ASSIGNMENT_STATUSES).optional(),
  mentorId: z.string().optional(),
  menteeId: z.string().optional(),
});

export const listSessionsQuerySchema = z.object({
  mentorId: z.string().optional(),
  menteeId: z.string().optional(),
  from: z.string().min(8).optional(),
  to: z.string().min(8).optional(),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type PatchAssignmentInput = z.infer<typeof patchAssignmentSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type PatchSessionInput = z.infer<typeof patchSessionSchema>;
export type ListAssignmentsQuery = z.infer<typeof listAssignmentsQuerySchema>;
export type ListSessionsQuery = z.infer<typeof listSessionsQuerySchema>;
