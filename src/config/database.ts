// Prisma client singleton.
// Reads the SAME database as the frontend (the SQLite file at
// `database/db/custom.db`, configurable via DATABASE_URL).
//
// In development we cache the client on globalThis to avoid spawning
// multiple PrismaClient instances during `bun --hot` reloads.

import { PrismaClient } from "@prisma/client";
import { env } from "./env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  // Pass the resolved DATABASE_URL explicitly so the Prisma client uses the
  // value from `.env` (env.ts loads it with `override: true` semantics) rather
  // than whatever the parent shell happened to export. This is the single
  // source of truth for the database file path.
  return new PrismaClient({
    datasources: { db: { url: env.DATABASE_URL } },
    log: env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["warn", "error"],
  });
}

export const db = globalForPrisma.prisma ?? createClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
