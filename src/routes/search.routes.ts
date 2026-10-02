// Search routes — /api/search
//   GET /?q=<query> — cross-module search (auth required; RBAC-filtered results)

import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { searchController } from "../controllers/search.controller";

const router = Router();

router.get("/", authenticate, searchController);

export default router;
