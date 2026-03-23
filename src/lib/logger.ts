type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  method?: string;
  path?: string;
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

function normalizeError(error: unknown): LogEntry["error"] | undefined {
  if (!error) return undefined;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    };
  }
  return { name: "UnknownError", message: String(error) };
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>, err?: unknown): void {
  if (!shouldLog(level)) return;

  // Extract well-known fields from context so they appear as top-level fields
  const requestId = context?.requestId as string | undefined;
  const method = context?.method as string | undefined;
  const path = context?.path as string | undefined;
  const restContext = context
    ? Object.fromEntries(Object.entries(context).filter(([k]) => !["requestId", "method", "path"].includes(k)))
    : undefined;

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(requestId && { requestId }),
    ...(method && { method }),
    ...(path && { path }),
    ...(restContext && Object.keys(restContext).length > 0 && { context: restContext }),
    ...(err != null && { error: normalizeError(err) }),
  };

  const output = JSON.stringify(entry);

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

/** Extract request metadata for structured logging */
function requestContext(request: Request): Record<string, unknown> {
  const requestId = request.headers.get("x-request-id") ?? undefined;
  let pathname: string | undefined;
  try {
    pathname = new URL(request.url).pathname;
  } catch {
    // ignore invalid URLs in tests
  }
  return {
    ...(requestId && { requestId }),
    method: request.method,
    ...(pathname && { path: pathname }),
  };
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => log("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) => log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => log("warn", message, context),
  error: (message: string, context?: Record<string, unknown>, err?: unknown) => log("error", message, context, err),

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
  apiError: (method: string, path: string, err: unknown, context?: Record<string, unknown>) => {
    log("error", `${method} ${path} failed`, { method, path, ...context }, err);
  },

  /** Log an info message scoped to a request */
  requestInfo: (request: Request, message: string, extra?: Record<string, unknown>) => {
    log("info", message, { ...requestContext(request), ...extra });
  },

  /** Log a warning scoped to a request */
  requestWarn: (request: Request, message: string, extra?: Record<string, unknown>) => {
    log("warn", message, { ...requestContext(request), ...extra });
  },

  /** Log an error scoped to a request */
  requestError: (request: Request, message: string, error: unknown, extra?: Record<string, unknown>) => {
    log("error", message, { ...requestContext(request), ...extra }, error);
  },
};
