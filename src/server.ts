// Entry point — starts the Express server on the configured port (3001
// by default) and wires up graceful shutdown.

import { env } from "./config/env";
import { app } from "./app";
import { db } from "./config/database";
import { logger } from "./utils/logger";

const port = env.PORT;

const server = app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`\n  Backend API running on port ${port}`);
  logger.info("server", `Embuni ELC backend started`, {
    port,
    env: env.NODE_ENV,
    database: env.DATABASE_URL,
  });
});

// ---------- Graceful shutdown ----------
async function shutdown(signal: string): Promise<void> {
  logger.info("server", `Received ${signal}, shutting down...`);
  server.close(async () => {
    try {
      await db.$disconnect();
      logger.info("server", "Prisma disconnected. Bye.");
      process.exit(0);
    } catch (err) {
      logger.error("server", "Error during shutdown", err);
      process.exit(1);
    }
  });
  // Force-exit after 10s if the server hangs on in-flight requests.
  setTimeout(() => {
    logger.error("server", "Forcing exit after timeout.");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  logger.error("server", "Unhandled promise rejection", reason);
});
process.on("uncaughtException", (err) => {
  logger.error("server", "Uncaught exception", err);
});
