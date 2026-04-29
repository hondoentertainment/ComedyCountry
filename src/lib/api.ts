import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  applyRequestContextHeaders,
  getClientAddress,
  getCorrelationId,
  getRequestId,
} from "@/lib/request-context";

export { getClientAddress, getCorrelationId, getRequestId } from "@/lib/request-context";

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

export function jsonResponse(
  request: Request,
  body: Record<string, unknown>,
  init?: ResponseInit
) {
  return applyRequestContextHeaders(NextResponse.json(body, init), request);
}

export function jsonError(
  request: Request,
  status: number,
  error: string,
  extras?: Record<string, unknown>
) {
  return jsonResponse(
    request,
    {
      error,
      requestId: getRequestId(request),
      ...extras,
    },
    { status }
  );
}

export function logInfo(
  request: Request,
  message: string,
  extra?: Record<string, unknown>
) {
  logger.info(message, {
    requestId: getRequestId(request),
    correlationId: getCorrelationId(request),
    method: request.method,
    path: new URL(request.url).pathname,
    clientAddress: getClientAddress(request),
    ...extra,
  });
}

export function logError(
  request: Request,
  message: string,
  error: unknown,
  extra?: Record<string, unknown>
) {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error(
    message,
    {
      requestId: getRequestId(request),
      correlationId: getCorrelationId(request),
      method: request.method,
      path: new URL(request.url).pathname,
      clientAddress: getClientAddress(request),
      ...extra,
    },
    err
  );
}

export function applyRateLimit(
  request: Request,
  key: string,
  options: RateLimitOptions
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
      Math.ceil((current.resetAt - now) / 1000)
    );
    return jsonError(request, 429, "Too many requests", {
      retryAfterSeconds,
    });
  }

  current.count += 1;
  store.set(scopedKey, current);
  return null;
}
