// Zod schemas for events endpoints.

import { z } from "zod";

export const EVENT_CATEGORIES = [
  "workshop",
  "seminar",
  "outreach",
  "social",
  "meeting",
  "ceremony",
] as const;

export const eventIdParamSchema = z.object({
  id: z.string().min(1),
});

export const listEventsQuerySchema = z.object({
  status: z
    .enum(["draft", "published", "ongoing", "completed", "cancelled", "archived", "all"])
    .optional(),
  upcoming: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  past: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  category: z.string().optional(),
  search: z.string().trim().optional(),
});

export const createEventSchema = z.object({
  title: z.string().min(3).max(160),
  summary: z.string().min(5).max(400),
  description: z.string().min(5).max(10000),
  category: z.enum(EVENT_CATEGORIES).optional(),
  coverUrl: z.union([z.string().url(), z.literal("")]).optional(),
  venue: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  startAt: z.string().min(1),
  endAt: z.string().min(1).optional().nullable(),
  capacity: z.number().int().min(1).max(100000).optional().nullable(),
  programId: z.string().optional().nullable(),
  slug: z.string().min(3).max(160).optional(),
});

export const patchEventSchema = z.object({
  title: z.string().min(3).max(160).optional(),
  summary: z.string().min(5).max(400).optional(),
  description: z.string().min(5).max(10000).optional(),
  category: z.enum(EVENT_CATEGORIES).nullable().optional(),
  coverUrl: z.union([z.string().url(), z.literal("")]).nullable().optional(),
  venue: z.string().max(200).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  startAt: z.string().min(1).optional(),
  endAt: z.string().min(1).nullable().optional(),
  capacity: z.number().int().min(1).max(100000).nullable().optional(),
  programId: z.string().nullable().optional(),
  slug: z.string().min(3).max(160).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type PatchEventInput = z.infer<typeof patchEventSchema>;
