// Finance routes — /api/finance/*
//   GET    /                — list financial records (finance.view OR finance.manage)
//   POST   /                — create financial record (finance.manage)
//   GET    /:id             — fetch single record
//   PATCH  /:id             — update record (finance.manage)
//   DELETE /:id             — hard delete record (finance.manage)
//   GET    /summary         — aggregate totals for the dashboard
//   GET    /budgets         — list budgets
//   POST   /budgets         — create budget (finance.manage)
//   PATCH  /budgets/:id     — update budget (finance.manage)
//   DELETE /budgets/:id     — hard delete budget (finance.manage)
//
// Note: `/summary` and `/budgets` are mounted BEFORE `/:id` so Express doesn't
// treat those literal segments as IDs.

import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requireAnyPermission, requirePermission } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { idParamSchema } from "../validators/shared.validator";
import {
  createBudgetSchema,
  createFinanceRecordSchema,
  financeSummaryQuerySchema,
  listFinanceQuerySchema,
  patchBudgetSchema,
  patchFinanceRecordSchema,
} from "../validators/finance.validator";
import {
  listFinanceRecordsController,
  createFinanceRecordController,
  getFinanceRecordController,
  updateFinanceRecordController,
  deleteFinanceRecordController,
  getFinanceSummaryController,
  listBudgetsController,
  createBudgetController,
  updateBudgetController,
  deleteBudgetController,
} from "../controllers/finance.controller";

const router = Router();

const viewOrManage = [requireAnyPermission("finance.view", "finance.manage")];

// Summary + budgets (literal paths MUST be matched before /:id).
router.get(
  "/summary",
  authenticate,
  ...viewOrManage,
  validate({ query: financeSummaryQuerySchema }),
  getFinanceSummaryController,
);
router.get("/budgets", authenticate, ...viewOrManage, listBudgetsController);
router.post(
  "/budgets",
  authenticate,
  requirePermission("finance.manage"),
  validate({ body: createBudgetSchema }),
  createBudgetController,
);
router.patch(
  "/budgets/:id",
  authenticate,
  requirePermission("finance.manage"),
  validate({ params: idParamSchema, body: patchBudgetSchema }),
  updateBudgetController,
);
router.delete(
  "/budgets/:id",
  authenticate,
  requirePermission("finance.manage"),
  validate({ params: idParamSchema }),
  deleteBudgetController,
);

// Records.
router.get(
  "/",
  authenticate,
  ...viewOrManage,
  validate({ query: listFinanceQuerySchema }),
  listFinanceRecordsController,
);
router.post(
  "/",
  authenticate,
  requirePermission("finance.manage"),
  validate({ body: createFinanceRecordSchema }),
  createFinanceRecordController,
);
router.get(
  "/:id",
  authenticate,
  ...viewOrManage,
  validate({ params: idParamSchema }),
  getFinanceRecordController,
);
router.patch(
  "/:id",
  authenticate,
  requirePermission("finance.manage"),
  validate({ params: idParamSchema, body: patchFinanceRecordSchema }),
  updateFinanceRecordController,
);
router.delete(
  "/:id",
  authenticate,
  requirePermission("finance.manage"),
  validate({ params: idParamSchema }),
  deleteFinanceRecordController,
);

export default router;
