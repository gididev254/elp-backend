// Gallery routes — /api/gallery/*
//   GET    /       — list gallery media (gallery.view OR gallery.manage)
//   POST   /       — create gallery media (gallery.manage)
//   GET    /:id    — fetch single gallery media
//   PATCH  /:id    — update gallery media (gallery.manage)
//   DELETE /:id    — hard delete gallery media (gallery.manage)

import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { requireAnyPermission, requirePermission } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import { idParamSchema } from "../validators/shared.validator";
import {
  createGallerySchema,
  listGalleryQuerySchema,
  patchGallerySchema,
} from "../validators/gallery.validator";
import {
  listGalleryController,
  createGalleryController,
  getGalleryController,
  updateGalleryController,
  deleteGalleryController,
} from "../controllers/gallery.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  requireAnyPermission("gallery.view", "gallery.manage"),
  validate({ query: listGalleryQuerySchema }),
  listGalleryController,
);

router.post(
  "/",
  authenticate,
  requirePermission("gallery.manage"),
  validate({ body: createGallerySchema }),
  createGalleryController,
);

router.get(
  "/:id",
  authenticate,
  requireAnyPermission("gallery.view", "gallery.manage"),
  validate({ params: idParamSchema }),
  getGalleryController,
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("gallery.manage"),
  validate({ params: idParamSchema, body: patchGallerySchema }),
  updateGalleryController,
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("gallery.manage"),
  validate({ params: idParamSchema }),
  deleteGalleryController,
);

export default router;
