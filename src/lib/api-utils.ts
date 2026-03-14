import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { z } from "zod/v4";

// ─── Standardized API Error Responses ───────────────────────────────────────

export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

export function errorResponse(status: number, code: string, message: string, details?: unknown): NextResponse<ApiError> {
  const body: ApiError = { error: message, code };
  if (details !== undefined) body.details = details;
  return NextResponse.json(body, { status });
}

export function badRequest(message = "Invalid request", details?: unknown) {
  return errorResponse(400, "BAD_REQUEST", message, details);
}

export function unauthorized(message = "Authentication required") {
  return errorResponse(401, "UNAUTHORIZED", message);
}

export function forbidden(message = "Insufficient permissions") {
  return errorResponse(403, "FORBIDDEN", message);
}

export function notFound(message = "Resource not found") {
  return errorResponse(404, "NOT_FOUND", message);
}

export function rateLimited(message = "Rate limit exceeded") {
  return errorResponse(429, "RATE_LIMITED", message);
}

export function serverError(message = "Internal server error") {
  return errorResponse(500, "INTERNAL_ERROR", message);
}

// ─── Auth Helper ────────────────────────────────────────────────────────────

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { session: null, error: unauthorized() };
  }
  return { session, error: null };
}

export async function requireRole(role: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { session: null, error: unauthorized() };
  }
  if ((session.user as { role?: string }).role !== role) {
    return { session: null, error: forbidden() };
  }
  return { session, error: null };
}

// ─── Request Validation ─────────────────────────────────────────────────────

export async function parseBody<T>(request: Request, schema: z.ZodType<T>): Promise<{ data: T; error: null } | { data: null; error: NextResponse<ApiError> }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { data: null, error: badRequest("Invalid JSON body") };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      data: null,
      error: badRequest("Validation failed", z.prettifyError(result.error)),
    };
  }

  return { data: result.data, error: null };
}

export function parseSearchParams<T>(params: URLSearchParams, schema: z.ZodType<T>): { data: T; error: null } | { data: null; error: NextResponse<ApiError> } {
  const obj: Record<string, string> = {};
  params.forEach((value, key) => {
    obj[key] = value;
  });

  const result = schema.safeParse(obj);
  if (!result.success) {
    return {
      data: null,
      error: badRequest("Invalid query parameters", z.prettifyError(result.error)),
    };
  }

  return { data: result.data, error: null };
}

// ─── Safe Route Handler Wrapper ─────────────────────────────────────────────

type RouteHandler = (request: Request, context?: unknown) => Promise<NextResponse>;

export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (request: Request, context?: unknown) => {
    const start = Date.now();
    const url = new URL(request.url);

    try {
      const response = await handler(request, context);
      logger.apiRequest(request.method, url.pathname, response.status, Date.now() - start);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.apiError(request.method, url.pathname, error);
      return serverError();
    }
  };
}
