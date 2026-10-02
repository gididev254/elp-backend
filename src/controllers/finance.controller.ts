// Finance controller — records, summary, budgets.

import type { Request, Response } from "express";
import {
  listFinanceRecords,
  createFinanceRecord,
  getFinanceRecord,
  updateFinanceRecord,
  deleteFinanceRecord,
  getFinanceSummary,
  listBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
} from "../services/finance.service";
import { ok, fail } from "../utils/response";

function clientIp(req: Request): string | undefined {
  return req.headers["x-forwarded-for"]?.toString();
}

// Records
export async function listFinanceRecordsController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await listFinanceRecords(
    {
      type: req.query.type as string | undefined,
      category: req.query.category as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      search: req.query.search as string | undefined,
    },
    req.user,
  );
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function createFinanceRecordController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await createFinanceRecord(req.body, req.user, clientIp(req));
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function getFinanceRecordController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await getFinanceRecord(req.params.id);
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function updateFinanceRecordController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await updateFinanceRecord(req.params.id, req.body, req.user, clientIp(req));
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function deleteFinanceRecordController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await deleteFinanceRecord(req.params.id, req.user, clientIp(req));
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

// Summary
export async function getFinanceSummaryController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await getFinanceSummary({
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
  });
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

// Budgets
export async function listBudgetsController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await listBudgets(req.user);
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function createBudgetController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await createBudget(req.body, req.user, clientIp(req));
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function updateBudgetController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await updateBudget(req.params.id, req.body, req.user, clientIp(req));
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}

export async function deleteBudgetController(req: Request, res: Response): Promise<void> {
  if (!req.user) { fail(res, "Authentication required.", 401); return; }
  const result = await deleteBudget(req.params.id, req.user, clientIp(req));
  if (!result.ok) { fail(res, result.error, result.status); return; }
  ok(res, result.data, result.status);
}
