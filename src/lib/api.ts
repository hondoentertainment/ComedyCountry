import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

type RateLimitOptions = {
  limit: number;
  windowMs: number;
  prefix: string;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const globalRateLimitStore = globalThis as typeof globalThis & {
  __punchlineRateLimitStore?: Map<string, RateLimitEntry>;
};

function getRateLimitStore() {
  if (!globalRateLimitStore.__punchlineRateLimitStore) {
    globalRateLimitStore.__punchlineRateLimitStore = new Map();
  }
  return globalRateLimitStore.__punchlineRateLimitStore;
}

export function resetRateLimitStore() {
  getRateLimitStore().clear();
}

export function getRequestId(request: Request) {
  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}

export function getClientAddress(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function jsonResponse(
  request: Request,
  body: Record<string, unknown>,
  init?: ResponseInit,
) {
  const response = NextResponse.json(body, init);
  response.headers.set("x-request-id", getRequestId(request));
  return response;
}

export function jsonError(
  request: Request,
  status: number,
  error: string,
  extras?: Record<string, unknown>,
) {
  return jsonResponse(
    request,
    {
      error,
      requestId: getRequestId(request),
      ...extras,
    },
    { status },
  );
}

export function logInfo(
  request: Request,
  message: string,
  extra?: Record<string, unknown>,
) {
  console.info(
    JSON.stringify({
      level: "info",
      message,
      requestId: getRequestId(request),
      method: request.method,
      path: new URL(request.url).pathname,
      ...extra,
    }),
  );
}

export function logError(
  request: Request,
  message: string,
  error: unknown,
  extra?: Record<string, unknown>,
) {
  const normalizedError =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack:
            process.env.NODE_ENV === "production" ? undefined : error.stack,
        }
      : { message: String(error) };

  logger.error(
    message,
    {
      requestId: getRequestId(request),
      method: request.method,
      path: new URL(request.url).pathname,
      error: normalizedError,
      ...extra,
    },
    error instanceof Error ? error : undefined,
  );
}

export function applyRateLimit(
  request: Request,
  key: string,
  options: RateLimitOptions,
) {
  const store = getRateLimitStore();
  const now = Date.now();
  const scopedKey = `${options.prefix}:${key}`;
  const current = store.get(scopedKey);

  if (!current || current.resetAt <= now) {
    store.set(scopedKey, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return null;
  }

  if (current.count >= options.limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((current.resetAt - now) / 1000),
    );
    return jsonError(request, 429, "Too many requests", {
      retryAfterSeconds,
    });
  }

  current.count += 1;
  store.set(scopedKey, current);
  return null;
}
