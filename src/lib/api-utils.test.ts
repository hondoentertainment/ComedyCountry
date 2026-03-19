import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import {
  errorResponse,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  rateLimited,
  serverError,
  requireAuth,
  requireRole,
  parseBody,
  parseSearchParams,
  withErrorHandler,
} from "./api-utils";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/logger", () => ({
  logger: {
    apiRequest: vi.fn(),
    apiError: vi.fn(),
  },
}));

import { getServerSession } from "next-auth";
import { logger } from "@/lib/logger";

describe("error response helpers", () => {
  it("errorResponse returns correct status and body", async () => {
    const res = errorResponse(418, "TEAPOT", "I'm a teapot");
    expect(res.status).toBe(418);
    const body = await res.json();
    expect(body).toEqual({ error: "I'm a teapot", code: "TEAPOT" });
  });

  it("errorResponse includes details when provided", async () => {
    const res = errorResponse(400, "BAD_REQUEST", "Validation failed", { field: "name" });
    const body = await res.json();
    expect(body.details).toEqual({ field: "name" });
  });

  it("errorResponse omits details when undefined", async () => {
    const res = errorResponse(400, "BAD_REQUEST", "Bad");
    const body = await res.json();
    expect(body).not.toHaveProperty("details");
  });

  it("badRequest returns 400", async () => {
    const res = badRequest();
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("BAD_REQUEST");
    expect(body.error).toBe("Invalid request");
  });

  it("badRequest accepts custom message", async () => {
    const res = badRequest("Custom message");
    const body = await res.json();
    expect(body.error).toBe("Custom message");
  });

  it("unauthorized returns 401", async () => {
    const res = unauthorized();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe("UNAUTHORIZED");
    expect(body.error).toBe("Authentication required");
  });

  it("forbidden returns 403", async () => {
    const res = forbidden();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("FORBIDDEN");
    expect(body.error).toBe("Insufficient permissions");
  });

  it("notFound returns 404", async () => {
    const res = notFound();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe("NOT_FOUND");
    expect(body.error).toBe("Resource not found");
  });

  it("rateLimited returns 429", async () => {
    const res = rateLimited();
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe("RATE_LIMITED");
    expect(body.error).toBe("Rate limit exceeded");
  });

  it("serverError returns 500", async () => {
    const res = serverError();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe("INTERNAL_ERROR");
    expect(body.error).toBe("Internal server error");
  });
});

describe("requireAuth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns session when authenticated", async () => {
    const session = { user: { id: "u1", email: "test@test.com" } };
    vi.mocked(getServerSession).mockResolvedValue(session as never);

    const result = await requireAuth();
    expect(result.session).toEqual(session);
    expect(result.error).toBeNull();
  });

  it("returns 401 error when session is null", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const result = await requireAuth();
    expect(result.session).toBeNull();
    expect(result.error).not.toBeNull();
    expect(result.error!.status).toBe(401);
  });

  it("returns 401 error when session has no user id", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: "test@test.com" },
    } as never);

    const result = await requireAuth();
    expect(result.session).toBeNull();
    expect(result.error!.status).toBe(401);
  });
});

describe("requireRole", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns session when user has correct role", async () => {
    const session = { user: { id: "u1", role: "admin" } };
    vi.mocked(getServerSession).mockResolvedValue(session as never);

    const result = await requireRole("admin");
    expect(result.session).toEqual(session);
    expect(result.error).toBeNull();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const result = await requireRole("admin");
    expect(result.error!.status).toBe(401);
  });

  it("returns 403 when role does not match", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "u1", role: "user" },
    } as never);

    const result = await requireRole("admin");
    expect(result.error!.status).toBe(403);
  });
});

describe("parseBody", () => {
  const schema = z.object({
    name: z.string(),
    age: z.number().optional(),
  });

  it("returns parsed data for valid body", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test", age: 25 }),
    });

    const result = await parseBody(request, schema);
    expect(result.data).toEqual({ name: "Test", age: 25 });
    expect(result.error).toBeNull();
  });

  it("returns 400 error for invalid JSON", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    const result = await parseBody(request, schema);
    expect(result.data).toBeNull();
    expect(result.error!.status).toBe(400);
  });

  it("returns 400 error for validation failure", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ age: "not a number" }),
    });

    const result = await parseBody(request, schema);
    expect(result.data).toBeNull();
    expect(result.error!.status).toBe(400);
  });

  it("allows optional fields to be missing", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test" }),
    });

    const result = await parseBody(request, schema);
    expect(result.data).toEqual({ name: "Test" });
    expect(result.error).toBeNull();
  });
});

describe("parseSearchParams", () => {
  const schema = z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  });

  it("returns parsed params for valid input", () => {
    const params = new URLSearchParams("page=1&limit=10");
    const result = parseSearchParams(params, schema);

    expect(result.data).toEqual({ page: "1", limit: "10" });
    expect(result.error).toBeNull();
  });

  it("handles empty params", () => {
    const params = new URLSearchParams();
    const result = parseSearchParams(params, schema);

    expect(result.data).toEqual({});
    expect(result.error).toBeNull();
  });

  it("returns error for invalid params", () => {
    const strictSchema = z.object({
      page: z.string().regex(/^\d+$/),
    });
    const params = new URLSearchParams("page=abc");
    const result = parseSearchParams(params, strictSchema);

    expect(result.data).toBeNull();
    expect(result.error!.status).toBe(400);
  });
});

describe("withErrorHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes through successful responses", async () => {
    const handler = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    const wrapped = withErrorHandler(handler);

    const request = new Request("http://localhost/api/test");
    const response = await wrapped(request);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(request, undefined);
  });

  it("logs API requests", async () => {
    const handler = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    const wrapped = withErrorHandler(handler);

    await wrapped(new Request("http://localhost/api/test", { method: "GET" }));

    expect(logger.apiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/test",
      200,
      expect.any(Number)
    );
  });

  it("catches errors and returns 500", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("Kaboom"));
    const wrapped = withErrorHandler(handler);

    const response = await wrapped(
      new Request("http://localhost/api/test")
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Internal server error");
  });

  it("logs errors when they occur", async () => {
    const error = new Error("Kaboom");
    const handler = vi.fn().mockRejectedValue(error);
    const wrapped = withErrorHandler(handler);

    await wrapped(new Request("http://localhost/api/test", { method: "POST" }));

    expect(logger.apiError).toHaveBeenCalledWith("POST", "/api/test", error);
  });

  it("handles non-Error thrown values", async () => {
    const handler = vi.fn().mockRejectedValue("string error");
    const wrapped = withErrorHandler(handler);

    const response = await wrapped(
      new Request("http://localhost/api/test")
    );

    expect(response.status).toBe(500);
    expect(logger.apiError).toHaveBeenCalledWith(
      "GET",
      "/api/test",
      expect.any(Error)
    );
  });

  it("passes context to handler", async () => {
    const handler = vi.fn().mockResolvedValue(
      new Response("{}", { status: 200 })
    );
    const wrapped = withErrorHandler(handler);
    const context = { params: { id: "123" } };

    await wrapped(new Request("http://localhost/api/test"), context);

    expect(handler).toHaveBeenCalledWith(
      expect.any(Request),
      context
    );
  });
});
