// Express app setup — middleware, routes, error handling.
// `server.ts` imports the configured app from here and starts listening.

import express, { type Application } from "express";
import cors from "cors";
import { env } from "./config/env";
import apiRoutes from "./routes";
import { notFoundHandler } from "./middleware/notFound";
import { errorHandler } from "./middleware/errorHandler";
import { logger } from "./utils/logger";

export function createApp(): Application {
  const app = express();

  // CORS — allow all origins in development. Tighten via CORS_ORIGIN in prod.
  const origins =
    env.CORS_ORIGIN === "*" ? "*" : (env.CORS_ORIGIN ?? "").split(",").filter(Boolean);
  app.use(
    cors({
      origin: origins === "*" ? true : origins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Forwarded-For"],
    }),
  );

  // Body parser — JSON only. URL-encoded forms not used by this API.
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));

  // Request logger (lightweight — every request gets a single log line).
  app.use((req, _res, next) => {
    logger.debug("http", `${req.method} ${req.originalUrl}`);
    next();
  });

  // Mount all module routes under /api.
  app.use("/api", apiRoutes);

  // Root — small banner so hitting `/` doesn't 404.
  app.get("/", (_req, res) => {
    res.json({
      name: "Embuni ELC Backend API",
      version: "0.1.0",
      docs: "/api",
      health: "/api/health",
    });
  });

  // 404 + centralised error handler — must be the LAST middleware.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
