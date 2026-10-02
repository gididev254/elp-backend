// Environment variable loader & validator.
// Loads `.env` (if present) and exposes a typed `env` object.
// Throws early if a required variable is missing.

import path from "node:path";

// Bun and Node 20+ load .env automatically when using `--env-file`, but we
// also fall back to a manual parse so the backend works in any runtime.
function loadDotenv() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require("node:fs");
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        // Strip surrounding quotes.
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        // The `.env` file is treated as the canonical configuration source
        // for this service — it MUST take precedence over any stale value
        // inherited from the parent shell environment (e.g. a sandbox that
        // exports DATABASE_URL pointing at an old path). This mirrors the
        // behaviour of `dotenv.config({ override: true })`.
        process.env[key] = value;
      }
    }
  } catch {
    // .env is optional — ignore parse errors.
  }
}

loadDotenv();

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") {
    throw new Error(
      `[env] Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env and configure it.`,
    );
  }
  return v;
}

function optional(name: string, fallback?: string): string | undefined {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  return v;
}

export const env = {
  DATABASE_URL: required("DATABASE_URL", "file:../database/db/custom.db"),
  JWT_SECRET: required("JWT_SECRET", "embuni-elc-backend-jwt-secret-change-in-production"),
  PORT: Number(optional("PORT", "3001")),
  NODE_ENV: optional("NODE_ENV", "development"),
  CORS_ORIGIN: optional("CORS_ORIGIN", "*"),
  JWT_EXPIRES_IN: optional("JWT_EXPIRES_IN", "7d"),
  ALLOWED_DOMAIN: optional("ALLOWED_DOMAIN", "embuni.ac.ke"),
} as const;

export type Env = typeof env;
