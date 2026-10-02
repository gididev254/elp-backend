// Zod schemas for finance endpoints (records + budgets + summary).

import { z } from "zod";

export const FINANCE_CATEGORIES = [
  "donations",
  "membership",
  "events",
  "supplies",
  "transport",
  "other",
] as const;

export const BUDGET_QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

export const createFinanceRecordSchema = z.object({
  type: z.enum(["income", "expenditure"]),
  category: z.enum(FINANCE_CATEGORIES).optional(),
  amount: z.number().positive().max(1_000_000_000),
  currency: z.string().min(3).max(3).optional(),
  description: z.string().min(3).max(500),
  date: z.string().min(8),
  reference: z.string().max(120).optional(),
});

export const patchFinanceRecordSchema = z.object({
  type: z.enum(["income", "expenditure"]).optional(),
  category: z.enum(FINANCE_CATEGORIES).nullable().optional(),
  amount: z.number().positive().max(1_000_000_000).optional(),
  currency: z.string().min(3).max(3).optional(),
  description: z.string().min(3).max(500).optional(),
  date: z.string().min(8).optional(),
  reference: z.string().max(120).nullable().optional(),
});

export const listFinanceQuerySchema = z.object({
  type: z.enum(["income", "expenditure"]).optional(),
  category: z.string().optional(),
  from: z.string().min(8).optional(),
  to: z.string().min(8).optional(),
  search: z.string().trim().optional(),
});

export const financeSummaryQuerySchema = z.object({
  from: z.string().min(8).optional(),
  to: z.string().min(8).optional(),
});

export const createBudgetSchema = z.object({
  title: z.string().min(3).max(160),
  fiscalYear: z
    .string()
    .regex(/^\d{4}$/u, "Fiscal year must be a 4-digit year, e.g. 2026"),
  quarter: z.enum(BUDGET_QUARTERS).optional(),
  category: z.enum(FINANCE_CATEGORIES).nullable().optional(),
  plannedIncome: z.number().min(0).max(1_000_000_000).optional(),
  plannedExpenditure: z.number().min(0).max(1_000_000_000).optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(["draft", "approved", "archived"]).optional(),
});

export const patchBudgetSchema = z.object({
  title: z.string().min(3).max(160).optional(),
  fiscalYear: z
    .string()
    .regex(/^\d{4}$/u, "Fiscal year must be a 4-digit year, e.g. 2026")
    .optional(),
  quarter: z.enum(BUDGET_QUARTERS).nullable().optional(),
  category: z.enum(FINANCE_CATEGORIES).nullable().optional(),
  plannedIncome: z.number().min(0).max(1_000_000_000).optional(),
  plannedExpenditure: z.number().min(0).max(1_000_000_000).optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: z.enum(["draft", "approved", "archived"]).optional(),
});

export type CreateFinanceRecordInput = z.infer<typeof createFinanceRecordSchema>;
export type PatchFinanceRecordInput = z.infer<typeof patchFinanceRecordSchema>;
export type ListFinanceQuery = z.infer<typeof listFinanceQuerySchema>;
export type FinanceSummaryQuery = z.infer<typeof financeSummaryQuerySchema>;
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type PatchBudgetInput = z.infer<typeof patchBudgetSchema>;
