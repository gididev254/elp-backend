// Auth routes — /api/auth/*
//   POST /login    — credentials → JWT
//   POST /register — create a pending user (hybrid controlled registration)
//   GET  /session  — verify JWT → current user data

import { Router } from "express";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/authenticate";
import { loginSchema, registerSchema } from "../validators/auth.validator";
import {
  loginController,
  registerController,
  sessionController,
} from "../controllers/auth.controller";

const router = Router();

router.post("/login", validate({ body: loginSchema }), loginController);
router.post("/register", validate({ body: registerSchema }), registerController);
router.get("/session", authenticate, sessionController);

export default router;
