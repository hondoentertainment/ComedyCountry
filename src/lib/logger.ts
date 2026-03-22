type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  context?: Record<string, unknown>;
  error?: { message: string; stack?: string; name: string };
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ?? (process.env.NODE_ENV === "production" ? "info" : "debug");

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>, err?: Error): void {
  if (!shouldLog(level)) return;

  // Extract requestId from context so it appears as a top-level field
  const requestId = context?.requestId as string | undefined;
  const restContext = context
    ? Object.fromEntries(Object.entries(context).filter(([k]) => k !== "requestId"))
    : undefined;

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(requestId && { requestId }),
    ...(restContext && Object.keys(restContext).length > 0 && { context: restContext }),
    ...(err && { error: { message: err.message, stack: err.stack, name: err.name } }),
  };

  const output = formatEntry(entry);

  switch (level) {
    case "error":
      console.error(output);
      break;
    case "warn":
      console.warn(output);
      break;
    default:
      console.log(output);
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => log("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) => log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => log("warn", message, context),
  error: (message: string, context?: Record<string, unknown>, err?: Error) => log("error", message, context, err),

  /** Log an API request with standard fields */
  apiRequest: (method: string, path: string, status: number, durationMs: number, context?: Record<string, unknown>) => {
    log(status >= 500 ? "error" : status >= 400 ? "warn" : "info", `${method} ${path} ${status}`, {
      method,
      path,
      status,
      durationMs,
      ...context,
    });
  },

  /** Log an error with the Error object */
  apiError: (method: string, path: string, err: Error, context?: Record<string, unknown>) => {
    log("error", `${method} ${path} failed`, { method, path, ...context }, err);
  },
};
