// Tiny console logger with level prefixing.
// Keep it simple — no external dependencies (no winston/pino).

type Level = "info" | "warn" | "error" | "debug";

const LEVEL_PREFIX: Record<Level, string> = {
  info: "ℹ",
  warn: "⚠",
  error: "✖",
  debug: "•",
};

function ts(): string {
  return new Date().toISOString();
}

function write(level: Level, scope: string, msg: unknown, extra?: unknown) {
  const prefix = `[${ts()}] ${LEVEL_PREFIX[level]} [${scope}]`;
  if (extra !== undefined) {
    // eslint-disable-next-line no-console
    console[level === "debug" ? "log" : level](prefix, msg, extra);
  } else {
    // eslint-disable-next-line no-console
    console[level === "debug" ? "log" : level](prefix, msg);
  }
}

export const logger = {
  info: (scope: string, msg: string, extra?: unknown) => write("info", scope, msg, extra),
  warn: (scope: string, msg: string, extra?: unknown) => write("warn", scope, msg, extra),
  error: (scope: string, msg: string, extra?: unknown) => write("error", scope, msg, extra),
  debug: (scope: string, msg: string, extra?: unknown) => {
    if (process.env.NODE_ENV !== "production") {
      write("debug", scope, msg, extra);
    }
  },
};

// Helper: record an audit log entry. Never throws — audit failures must
// not break the request flow.
export async function recordAudit(params: {
  actorId?: string | null;
  action: string;
  target?: string | null;
  context?: Record<string, unknown> | null;
  ip?: string | null;
}): Promise<void> {
  try {
    const { db } = await import("../config/database");
    await db.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        action: params.action,
        target: params.target ?? null,
        context: params.context ? JSON.stringify(params.context) : null,
        ip: params.ip ?? null,
      },
    });
  } catch (err) {
    logger.error("audit", "failed to record audit entry", err);
  }
}
