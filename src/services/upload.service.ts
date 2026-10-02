// Upload service — file upload with type/size validation.
// Mirrors the frontend `/api/upload` route handler contract:
//   POST multipart/form-data with field "file"
//   Returns: { url, filename, storedName, size, category, extension }
//
// Files are stored in `/database/uploads/`. The frontend's `public/uploads`
// directory is symlinked to this location so uploaded files are immediately
// servable via Next.js's static asset handler at `/uploads/<storedName>`.

import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { recordAudit } from "../utils/logger";
import type { ResolvedUser, ServiceResult } from "../types/auth";

// Resolve the uploads directory relative to the project root.
// This file lives at `backend/src/services/upload.service.ts`, so the
// project root is 4 levels up: services -> src -> backend -> project root.
const UPLOADS_DIR = path.resolve(__dirname, "../../../database/uploads");
const MAX_SIZE = 8 * 1024 * 1024; // 8 MB
const PUBLIC_URL_PREFIX = "/uploads";

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg"]);

const DOC_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
]);

const DOC_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "csv",
  "zip",
]);

export interface UploadedFile {
  url: string;
  filename: string;
  storedName: string;
  size: number;
  category: "image" | "document";
  extension: string;
}

export interface UploadInput {
  originalName: string;
  mimeType: string;
  data: Buffer;
}

export async function processUpload(
  input: UploadInput,
  actor: ResolvedUser,
  ip?: string,
): Promise<ServiceResult<UploadedFile>> {
  if (input.data.length === 0) {
    return { ok: false, error: "File is empty.", status: 422 };
  }
  if (input.data.length > MAX_SIZE) {
    return {
      ok: false,
      error: `File too large. Maximum allowed size is ${Math.round(MAX_SIZE / 1024 / 1024)} MB.`,
      status: 413,
    };
  }

  const extension = path.extname(input.originalName).slice(1).toLowerCase();
  const mimeType = (input.mimeType || "").toLowerCase();

  let category: "image" | "document";
  if (IMAGE_MIME.has(mimeType) || IMAGE_EXTENSIONS.has(extension)) {
    category = "image";
  } else if (DOC_MIME.has(mimeType) || DOC_EXTENSIONS.has(extension)) {
    category = "document";
  } else {
    return {
      ok: false,
      error:
        "Unsupported file type. Allowed: images (jpg/png/gif/webp/svg), documents (pdf/doc/xls/ppt/txt/csv/zip).",
      status: 422,
    };
  }

  // Ensure the uploads directory exists.
  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  // Generate a collision-resistant stored name. Format:
  //   <timestamp>-<8hex>.<ext>
  const stamp = Date.now();
  const rand = crypto.randomBytes(4).toString("hex");
  const safeExt = extension || (category === "image" ? "png" : "bin");
  const storedName = `${stamp}-${rand}.${safeExt}`;

  const destPath = path.join(UPLOADS_DIR, storedName);
  await fs.writeFile(destPath, input.data);

  const uploaded: UploadedFile = {
    url: `${PUBLIC_URL_PREFIX}/${storedName}`,
    filename: input.originalName,
    storedName,
    size: input.data.length,
    category,
    extension: safeExt,
  };

  await recordAudit({
    actorId: actor.id,
    action: "upload.create",
    target: `upload:${storedName}`,
    context: {
      filename: input.originalName,
      mimeType,
      size: input.data.length,
      category,
      storedName,
    },
    ip,
  });

  return { ok: true, status: 201, data: uploaded };
}
