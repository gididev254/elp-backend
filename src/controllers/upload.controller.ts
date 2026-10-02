// Upload controller — multipart/form-data file upload.
// Uses multer to parse the incoming multipart request, then delegates to the
// upload service for validation + storage + audit logging.

import type { Request, Response } from "express";
import multer from "multer";
import { processUpload } from "../services/upload.service";
import { ok, fail } from "../utils/response";

// Memory storage — we validate and write to disk ourselves in the service
// layer so the audit log + storage can run in the same transaction-ish flow.
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB hard cap (also enforced in service).
});

// Named export so the route can mount the multer middleware before the handler.
export const uploadMiddleware = upload.single("file");

export async function uploadFileController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.user) {
    fail(res, "Authentication required.", 401);
    return;
  }
  if (!req.file) {
    fail(res, "No file provided. Attach a file under the 'file' field.", 422);
    return;
  }

  const ip = req.headers["x-forwarded-for"]?.toString();
  const result = await processUpload(
    {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      data: req.file.buffer,
    },
    req.user,
    ip,
  );

  if (!result.ok) {
    fail(res, result.error, result.status);
    return;
  }
  ok(res, result.data, result.status);
}
