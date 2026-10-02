// Zod schemas for gallery endpoints.

import { z } from "zod";

export const GALLERY_STATUSES = ["draft", "published", "archived"] as const;

export const createGallerySchema = z.object({
  title: z.string().min(2).max(160),
  imageUrl: z.string().min(3).max(2000),
  caption: z.string().max(600).optional(),
  album: z.string().max(80).optional(),
  eventId: z.string().max(120).optional(),
  status: z.enum(GALLERY_STATUSES).optional(),
});

export const patchGallerySchema = z.object({
  title: z.string().min(2).max(160).optional(),
  imageUrl: z.string().min(3).max(2000).optional(),
  caption: z.string().max(600).nullable().optional(),
  album: z.string().max(80).nullable().optional(),
  eventId: z.string().max(120).nullable().optional(),
  status: z.enum(GALLERY_STATUSES).optional(),
});

export const listGalleryQuerySchema = z.object({
  status: z.string().optional(), // "all" or one of GALLERY_STATUSES
  album: z.string().optional(),
  search: z.string().trim().optional(),
});

export type CreateGalleryInput = z.infer<typeof createGallerySchema>;
export type PatchGalleryInput = z.infer<typeof patchGallerySchema>;
export type ListGalleryQuery = z.infer<typeof listGalleryQuerySchema>;
