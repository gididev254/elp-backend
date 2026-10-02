// Shared Zod schemas reused across modules.

import { z } from "zod";

// Generic :id URL parameter — every module with a resource-by-id endpoint
// can mount this via `validate({ params: idParamSchema })`.
export const idParamSchema = z.object({
  id: z.string().min(1, "id is required."),
});

// Pagination helpers for list endpoints.
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

// Search query — minimum 2 characters to avoid trivial substring scans.
export const searchQuerySchema = z.object({
  q: z.string().trim().min(2, "Query must be at least 2 characters."),
});

// Optional date range — used by finance / audit / mentorship sessions.
export const dateRangeQuerySchema = z.object({
  from: z.string().min(8).optional(),
  to: z.string().min(8).optional(),
});

export type IdParam = z.infer<typeof idParamSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
