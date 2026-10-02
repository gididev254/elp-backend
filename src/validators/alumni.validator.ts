// Zod schemas for alumni endpoints.

import { z } from "zod";

export const ENGAGEMENT_LEVELS = [
  "active",
  "passive",
  "mentor",
  "uncontactable",
] as const;

export const ALUMNI_STATUSES = ["active", "archived"] as const;

const currentYear = new Date().getFullYear();

export const createAlumniSchema = z.object({
  userId: z.string().min(1).optional().nullable(),
  fullName: z.string().min(2).max(200),
  email: z.string().email().max(200),
  phone: z.string().max(40).optional().nullable(),
  graduationYear: z.number().int().min(1970).max(currentYear + 1),
  formerRole: z.string().max(160).optional().nullable(),
  school: z.string().max(200).optional().nullable(),
  program: z.string().max(200).optional().nullable(),
  currentOccupation: z.string().max(200).optional().nullable(),
  company: z.string().max(200).optional().nullable(),
  linkedinUrl: z
    .union([z.string().url(), z.literal("")])
    .optional()
    .nullable(),
  bio: z.string().max(5000).optional().nullable(),
  avatarUrl: z
    .union([z.string().url(), z.literal("")])
    .optional()
    .nullable(),
  engagementLevel: z.enum(ENGAGEMENT_LEVELS).optional(),
  status: z.enum(ALUMNI_STATUSES).optional(),
});

export const patchAlumniSchema = z.object({
  userId: z.string().min(1).nullable().optional(),
  fullName: z.string().min(2).max(200).optional(),
  email: z.string().email().max(200).optional(),
  phone: z.string().max(40).nullable().optional(),
  graduationYear: z.number().int().min(1970).max(currentYear + 1).optional(),
  formerRole: z.string().max(160).nullable().optional(),
  school: z.string().max(200).nullable().optional(),
  program: z.string().max(200).nullable().optional(),
  currentOccupation: z.string().max(200).nullable().optional(),
  company: z.string().max(200).nullable().optional(),
  linkedinUrl: z
    .union([z.string().url(), z.literal("")])
    .nullable()
    .optional(),
  bio: z.string().max(5000).nullable().optional(),
  avatarUrl: z
    .union([z.string().url(), z.literal("")])
    .nullable()
    .optional(),
  engagementLevel: z.enum(ENGAGEMENT_LEVELS).optional(),
  status: z.enum(ALUMNI_STATUSES).optional(),
});

export const listAlumniQuerySchema = z.object({
  engagementLevel: z.enum(ENGAGEMENT_LEVELS).optional(),
  graduationYear: z.coerce.number().int().min(1970).max(currentYear + 1).optional(),
  search: z.string().trim().optional(),
  status: z.enum(ALUMNI_STATUSES).optional(),
});

export type CreateAlumniInput = z.infer<typeof createAlumniSchema>;
export type PatchAlumniInput = z.infer<typeof patchAlumniSchema>;
export type ListAlumniQuery = z.infer<typeof listAlumniQuerySchema>;
