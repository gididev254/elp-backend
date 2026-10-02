// Finance service — financial records CRUD, summary aggregation, budgets CRUD.
// Mirrors the frontend `/api/finance/*` route handlers.

import { db } from "../config/database";
import { recordAudit } from "../utils/logger";
import type { ResolvedUser, ServiceResult } from "../types/auth";
import type {
  CreateBudgetInput,
  CreateFinanceRecordInput,
  FinanceSummaryQuery,
  PatchBudgetInput,
  PatchFinanceRecordInput,
} from "../validators/finance.validator";

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

interface FinanceRecordWithRecorder {
  id: string;
  type: string;
  category: string | null;
  amount: number;
  currency: string;
  description: string;
  date: Date;
  reference: string | null;
  recordedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  recordedBy: {
    id: string;
    email: string;
    profile: { fullName: string; preferredName: string | null } | null;
  } | null;
}

function serialiseRecord(r: FinanceRecordWithRecorder) {
  return {
    id: r.id,
    type: r.type,
    category: r.category,
    amount: r.amount,
    currency: r.currency,
    description: r.description,
    date: r.date.toISOString(),
    reference: r.reference,
    recordedById: r.recordedById,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    recordedBy: r.recordedBy
      ? {
          id: r.recordedBy.id,
          email: r.recordedBy.email,
          name:
            r.recordedBy.profile?.preferredName ||
            r.recordedBy.profile?.fullName ||
            r.recordedBy.email,
        }
      : null,
  };
}

export async function listFinanceRecords(
  query: { type?: string; category?: string; from?: string; to?: string; search?: string },
  actor: ResolvedUser,
): Promise<ServiceResult<{ items: unknown[]; canManage: boolean }>> {
  const where: Record<string, unknown> = {};
  if (query.type && (query.type === "income" || query.type === "expenditure")) {
    where.type = query.type;
  }
  if (query.category) where.category = query.category;

  const range: Record<string, Date> = {};
  if (query.from) {
    const d = new Date(query.from);
    if (!Number.isNaN(d.getTime())) range.gte = d;
  }
  if (query.to) {
    const d = new Date(query.to);
    if (!Number.isNaN(d.getTime())) range.lte = d;
  }
  if (Object.keys(range).length > 0) where.date = range;

  if (query.search) {
    where.OR = [
      { description: { contains: query.search } },
      { reference: { contains: query.search } },
    ];
  }

  const records = await db.financialRecord.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 200,
    include: {
      recordedBy: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true, preferredName: true } },
        },
      },
    },
  });

  return {
    ok: true,
    status: 200,
    data: {
      items: records.map((r) => serialiseRecord(r as FinanceRecordWithRecorder)),
      canManage: actor.permissions.has("finance.manage"),
    },
  };
}

export async function createFinanceRecord(
  input: CreateFinanceRecordInput,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<unknown>> {
  const date = new Date(input.date);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: "Invalid date.", status: 422 };
  }

  const record = await db.financialRecord.create({
    data: {
      type: input.type,
      category: input.category ?? null,
      amount: input.amount,
      currency: input.currency?.toUpperCase() ?? "KES",
      description: input.description,
      date,
      reference: input.reference?.trim() || null,
      recordedById: actor.id,
    },
  });

  await recordAudit({
    actorId: actor.id,
    action: "finance.create",
    target: `finance:${record.id}`,
    context: {
      type: record.type,
      category: record.category,
      amount: record.amount,
      currency: record.currency,
      description: record.description,
      date: record.date.toISOString(),
    },
    ip,
  });

  return {
    ok: true,
    status: 201,
    data: {
      id: record.id,
      type: record.type,
      category: record.category,
      amount: record.amount,
      currency: record.currency,
      description: record.description,
      date: record.date.toISOString(),
      reference: record.reference,
      recordedById: record.recordedById,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    },
  };
}

export async function getFinanceRecord(
  id: string,
): Promise<ServiceResult<unknown>> {
  const r = await db.financialRecord.findUnique({
    where: { id },
    include: {
      recordedBy: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true, preferredName: true } },
        },
      },
    },
  });
  if (!r) return { ok: false, error: "Financial record not found.", status: 404 };
  return { ok: true, status: 200, data: serialiseRecord(r as FinanceRecordWithRecorder) };
}

export async function updateFinanceRecord(
  id: string,
  input: PatchFinanceRecordInput,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<unknown>> {
  const existing = await db.financialRecord.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "Financial record not found.", status: 404 };
  }

  let nextDate = existing.date;
  if (input.date) {
    const d = new Date(input.date);
    if (Number.isNaN(d.getTime())) {
      return { ok: false, error: "Invalid date.", status: 422 };
    }
    nextDate = d;
  }

  const data: Record<string, unknown> = { date: nextDate };
  if (input.type !== undefined) data.type = input.type;
  if (input.category !== undefined) data.category = input.category;
  if (input.amount !== undefined) data.amount = input.amount;
  if (input.currency !== undefined) data.currency = input.currency.toUpperCase();
  if (input.description !== undefined) data.description = input.description;
  if (input.reference !== undefined) {
    data.reference = input.reference?.trim() || null;
  }

  const record = await db.financialRecord.update({ where: { id }, data });

  await recordAudit({
    actorId: actor.id,
    action: "finance.update",
    target: `finance:${record.id}`,
    context: {
      type: record.type,
      category: record.category,
      amount: record.amount,
      changed: Object.keys(input),
    },
    ip,
  });

  return {
    ok: true,
    status: 200,
    data: {
      id: record.id,
      type: record.type,
      category: record.category,
      amount: record.amount,
      currency: record.currency,
      description: record.description,
      date: record.date.toISOString(),
      reference: record.reference,
      recordedById: record.recordedById,
      updatedAt: record.updatedAt.toISOString(),
    },
  };
}

export async function deleteFinanceRecord(
  id: string,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<{ id: string }>> {
  const existing = await db.financialRecord.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "Financial record not found.", status: 404 };
  }

  // Snapshot to audit log BEFORE hard delete (finance records have no archival).
  await recordAudit({
    actorId: actor.id,
    action: "finance.delete",
    target: `finance:${existing.id}`,
    context: {
      type: existing.type,
      category: existing.category,
      amount: existing.amount,
      currency: existing.currency,
      description: existing.description,
      date: existing.date.toISOString(),
      reference: existing.reference,
    },
    ip,
  });

  await db.financialRecord.delete({ where: { id } });

  return { ok: true, status: 200, data: { id } };
}

// ---------------------------------------------------------------------------
// Summary — aggregate totals for the Finance dashboard
// ---------------------------------------------------------------------------

interface CategoryBucket {
  category: string;
  income: number;
  expenditure: number;
}

interface MonthBucket {
  month: string;
  income: number;
  expenditure: number;
}

export async function getFinanceSummary(
  query: FinanceSummaryQuery,
): Promise<ServiceResult<unknown>> {
  const where: Record<string, unknown> = {};
  const range: Record<string, Date> = {};
  if (query.from) {
    const d = new Date(query.from);
    if (!Number.isNaN(d.getTime())) range.gte = d;
  }
  if (query.to) {
    const d = new Date(query.to);
    if (!Number.isNaN(d.getTime())) range.lte = d;
  }
  if (Object.keys(range).length > 0) where.date = range;

  const totalsByType = await db.financialRecord.groupBy({
    by: ["type"],
    where,
    _sum: { amount: true },
  });

  const totalIncome =
    totalsByType.find((t) => t.type === "income")?._sum.amount ?? 0;
  const totalExpenditure =
    totalsByType.find((t) => t.type === "expenditure")?._sum.amount ?? 0;
  const netBalance = totalIncome - totalExpenditure;

  const byCategoryRaw = await db.financialRecord.groupBy({
    by: ["category", "type"],
    where,
    _sum: { amount: true },
  });

  const categoryMap = new Map<string, CategoryBucket>();
  for (const row of byCategoryRaw) {
    const key = row.category ?? "other";
    if (!categoryMap.has(key)) {
      categoryMap.set(key, { category: key, income: 0, expenditure: 0 });
    }
    const bucket = categoryMap.get(key)!;
    if (row.type === "income") bucket.income += row._sum.amount ?? 0;
    else bucket.expenditure += row._sum.amount ?? 0;
  }
  const byCategory: CategoryBucket[] = Array.from(categoryMap.values()).sort(
    (a, b) => b.income + b.expenditure - (a.income + a.expenditure),
  );

  // Monthly time series — last 6 months.
  const now = new Date();
  const months: MonthBucket[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ month: monthKey, income: 0, expenditure: 0 });
  }

  const records = await db.financialRecord.findMany({
    where,
    select: { type: true, amount: true, date: true },
  });
  const monthIndex = new Map(months.map((m, i) => [m.month, i]));
  for (const r of records) {
    const key = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, "0")}`;
    const idx = monthIndex.get(key);
    if (idx === undefined) continue;
    if (r.type === "income") months[idx].income += r.amount;
    else months[idx].expenditure += r.amount;
  }

  return {
    ok: true,
    status: 200,
    data: {
      totalIncome,
      totalExpenditure,
      netBalance,
      currency: "KES",
      byCategory,
      byMonth: months,
    },
  };
}

// ---------------------------------------------------------------------------
// Budgets
// ---------------------------------------------------------------------------

interface BudgetRow {
  id: string;
  title: string;
  fiscalYear: string;
  quarter: string | null;
  category: string | null;
  plannedIncome: number;
  plannedExpenditure: number;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

function serialiseBudget(b: BudgetRow) {
  return {
    id: b.id,
    title: b.title,
    fiscalYear: b.fiscalYear,
    quarter: b.quarter,
    category: b.category,
    plannedIncome: b.plannedIncome,
    plannedExpenditure: b.plannedExpenditure,
    notes: b.notes,
    status: b.status,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

export async function listBudgets(
  actor: ResolvedUser,
): Promise<ServiceResult<{ items: unknown[]; canManage: boolean }>> {
  const budgets = await db.budget.findMany({
    orderBy: [{ fiscalYear: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return {
    ok: true,
    status: 200,
    data: {
      items: budgets.map((b) => serialiseBudget(b as BudgetRow)),
      canManage: actor.permissions.has("finance.manage"),
    },
  };
}

export async function createBudget(
  input: CreateBudgetInput,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<unknown>> {
  const budget = await db.budget.create({
    data: {
      title: input.title,
      fiscalYear: input.fiscalYear,
      quarter: input.quarter ?? null,
      category: input.category ?? null,
      plannedIncome: input.plannedIncome ?? 0,
      plannedExpenditure: input.plannedExpenditure ?? 0,
      notes: input.notes?.trim() || null,
      status: input.status ?? "draft",
    },
  });

  await recordAudit({
    actorId: actor.id,
    action: "budget.create",
    target: `budget:${budget.id}`,
    context: {
      title: budget.title,
      fiscalYear: budget.fiscalYear,
      quarter: budget.quarter,
      plannedIncome: budget.plannedIncome,
      plannedExpenditure: budget.plannedExpenditure,
      status: budget.status,
    },
    ip,
  });

  return { ok: true, status: 201, data: serialiseBudget(budget as BudgetRow) };
}

export async function updateBudget(
  id: string,
  input: PatchBudgetInput,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<unknown>> {
  const existing = await db.budget.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "Budget not found.", status: 404 };
  }

  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.fiscalYear !== undefined) data.fiscalYear = input.fiscalYear;
  if (input.quarter !== undefined) data.quarter = input.quarter;
  if (input.category !== undefined) data.category = input.category;
  if (input.plannedIncome !== undefined) data.plannedIncome = input.plannedIncome;
  if (input.plannedExpenditure !== undefined) data.plannedExpenditure = input.plannedExpenditure;
  if (input.notes !== undefined) data.notes = input.notes?.trim() || null;
  if (input.status !== undefined) data.status = input.status;

  const budget = await db.budget.update({ where: { id }, data });

  await recordAudit({
    actorId: actor.id,
    action: "budget.update",
    target: `budget:${budget.id}`,
    context: {
      title: budget.title,
      fiscalYear: budget.fiscalYear,
      changed: Object.keys(input),
    },
    ip,
  });

  return { ok: true, status: 200, data: serialiseBudget(budget as BudgetRow) };
}

export async function deleteBudget(
  id: string,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<{ id: string }>> {
  const existing = await db.budget.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "Budget not found.", status: 404 };
  }

  await recordAudit({
    actorId: actor.id,
    action: "budget.delete",
    target: `budget:${existing.id}`,
    context: {
      title: existing.title,
      fiscalYear: existing.fiscalYear,
      plannedIncome: existing.plannedIncome,
      plannedExpenditure: existing.plannedExpenditure,
      status: existing.status,
    },
    ip,
  });

  await db.budget.delete({ where: { id } });

  return { ok: true, status: 200, data: { id } };
}
