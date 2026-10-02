// Upload routes — /api/upload
//   POST / — multipart/form-data file upload with validation.
//            Auth required; any active user can upload.
//            Body field name: "file".
//            Returns: { url, filename, storedName, size, category, extension }

import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { uploadMiddleware, uploadFileController } from "../controllers/upload.controller";

const router = Router();

router.post(
  "/",
  authenticate,
  // multer parses multipart/form-data and attaches req.file (memory storage).
  uploadMiddleware,
  uploadFileController,
);

export default router;
