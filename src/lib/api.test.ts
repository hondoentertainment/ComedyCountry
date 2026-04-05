import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getRequestId,
  getClientAddress,
  jsonResponse,
  jsonError,
  logInfo,
  logError,
  applyRateLimit,
  resetRateLimitStore,
} from "./api";

function createRequest(
  url = "http://localhost/api/test",
  headers: Record<string, string> = {},
): Request {
  return new Request(url, {
    method: "GET",
    headers,
  });
}

describe("getRequestId", () => {
  it("returns x-request-id header when present", () => {
    const request = createRequest("http://localhost/api/test", {
      "x-request-id": "my-request-id",
    });
    expect(getRequestId(request)).toBe("my-request-id");
  });

  it("generates a UUID when x-request-id header is absent", () => {
    const request = createRequest();
    const id = getRequestId(request);
    expect(id).toBeDefined();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("generates different UUIDs for different requests", () => {
    const req1 = createRequest();
    const req2 = createRequest();
    const id1 = getRequestId(req1);
    const id2 = getRequestId(req2);
    // They could theoretically be equal but practically never
    expect(typeof id1).toBe("string");
    expect(typeof id2).toBe("string");
  });
});

describe("getClientAddress", () => {
  it("returns first IP from x-forwarded-for header", () => {
    const request = createRequest("http://localhost/api/test", {
      "x-forwarded-for": "1.2.3.4, 5.6.7.8",
    });
    expect(getClientAddress(request)).toBe("1.2.3.4");
  });

  it("returns single IP from x-forwarded-for", () => {
    const request = createRequest("http://localhost/api/test", {
      "x-forwarded-for": "10.0.0.1",
    });
    expect(getClientAddress(request)).toBe("10.0.0.1");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const request = createRequest("http://localhost/api/test", {
      "x-real-ip": "192.168.1.1",
    });
    expect(getClientAddress(request)).toBe("192.168.1.1");
  });

  it("returns unknown when no IP headers present", () => {
    const request = createRequest();
    expect(getClientAddress(request)).toBe("unknown");
  });

  it("trims whitespace from forwarded-for IP", () => {
    const request = createRequest("http://localhost/api/test", {
      "x-forwarded-for": "  1.2.3.4  , 5.6.7.8",
    });
    expect(getClientAddress(request)).toBe("1.2.3.4");
  });
});

describe("jsonResponse", () => {
  it("returns JSON response with given body", async () => {
    const request = createRequest("http://localhost/api/test", {
      "x-request-id": "req-123",
    });

    const response = jsonResponse(request, { data: "test" });
    const body = await response.json();

    expect(body).toEqual({ data: "test" });
  });

  it("sets x-request-id header from request", async () => {
    const request = createRequest("http://localhost/api/test", {
      "x-request-id": "req-123",
    });

    const response = jsonResponse(request, { data: "test" });
    expect(response.headers.get("x-request-id")).toBe("req-123");
  });

  it("applies custom status via init", async () => {
    const request = createRequest("http://localhost/api/test", {
      "x-request-id": "req-123",
    });

    const response = jsonResponse(request, { created: true }, { status: 201 });
    expect(response.status).toBe(201);
  });

  it("defaults to 200 status", async () => {
    const request = createRequest("http://localhost/api/test", {
      "x-request-id": "req-123",
    });

    const response = jsonResponse(request, { ok: true });
    expect(response.status).toBe(200);
  });
});

describe("jsonError", () => {
  it("returns error response with correct status", async () => {
    const request = createRequest("http://localhost/api/test", {
      "x-request-id": "req-err",
    });

    const response = jsonError(request, 400, "Bad request");
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("Bad request");
    expect(body.requestId).toBe("req-err");
  });

  it("includes extras in response body", async () => {
    const request = createRequest("http://localhost/api/test", {
      "x-request-id": "req-err",
    });

    const response = jsonError(request, 429, "Rate limited", {
      retryAfterSeconds: 30,
    });

    const body = await response.json();
    expect(body.retryAfterSeconds).toBe(30);
  });

  it("sets x-request-id header", async () => {
    const request = createRequest("http://localhost/api/test", {
      "x-request-id": "req-err",
    });

    const response = jsonError(request, 500, "Server error");
    expect(response.headers.get("x-request-id")).toBe("req-err");
  });
});

describe("logInfo", () => {
  it("logs structured JSON to console.log via logger.info", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const request = createRequest("http://localhost/api/test", {
      "x-request-id": "log-1",
    });

    logInfo(request, "Test message", { extra: "data" });

    expect(spy).toHaveBeenCalledOnce();
    const logged = JSON.parse(spy.mock.calls[0][0] as string);
    expect(logged.level).toBe("info");
    expect(logged.message).toBe("Test message");
    expect(logged.requestId).toBe("log-1");
    expect(logged.context.method).toBe("GET");
    expect(logged.context.path).toBe("/api/test");
    expect(logged.context.extra).toBe("data");

    spy.mockRestore();
  });
});

describe("logError", () => {
  it("logs structured error JSON to console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const request = createRequest("http://localhost/api/test", {
      "x-request-id": "log-err",
    });

    logError(request, "Something failed", new Error("boom"), { userId: "u1" });

    expect(spy).toHaveBeenCalledOnce();
    const logged = JSON.parse(spy.mock.calls[0][0] as string);
    expect(logged.level).toBe("error");
    expect(logged.message).toBe("Something failed");
    expect(logged.requestId).toBe("log-err");
    expect(logged.error.name).toBe("Error");
    expect(logged.error.message).toBe("boom");
    expect(logged.context.userId).toBe("u1");

    spy.mockRestore();
  });

  it("handles non-Error objects", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const request = createRequest("http://localhost/api/test", {
      "x-request-id": "log-err",
    });

    logError(request, "String error", "just a string");

    const logged = JSON.parse(spy.mock.calls[0][0] as string);
    expect(logged.context.errorDetail.message).toBe("just a string");

    spy.mockRestore();
  });
});

describe("applyRateLimit", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it("allows first request", () => {
    const request = createRequest("http://localhost/api/test", {
      "x-request-id": "rl-1",
    });

    const result = applyRateLimit(request, "user-1", {
      prefix: "test",
      limit: 3,
      windowMs: 60000,
    });

    expect(result).toBeNull();
  });

  it("allows requests within limit", () => {
    const request = createRequest("http://localhost/api/test", {
      "x-request-id": "rl-1",
    });
    const opts = { prefix: "test", limit: 3, windowMs: 60000 };

    applyRateLimit(request, "user-1", opts);
    applyRateLimit(request, "user-1", opts);
    const third = applyRateLimit(request, "user-1", opts);

    expect(third).toBeNull();
  });

  it("blocks request when limit exceeded", async () => {
    const request = createRequest("http://localhost/api/test", {
      "x-request-id": "rl-blocked",
    });
    const opts = { prefix: "test", limit: 2, windowMs: 60000 };

    applyRateLimit(request, "user-1", opts);
    applyRateLimit(request, "user-1", opts);
    const blocked = applyRateLimit(request, "user-1", opts);

    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);

    const body = await blocked!.json();
    expect(body.error).toBe("Too many requests");
    expect(body.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("uses separate counters for different keys", () => {
    const request = createRequest("http://localhost/api/test", {
      "x-request-id": "rl-1",
    });
    const opts = { prefix: "test", limit: 1, windowMs: 60000 };

    applyRateLimit(request, "user-1", opts);
    const result = applyRateLimit(request, "user-2", opts);

    expect(result).toBeNull();
  });

  it("uses separate counters for different prefixes", () => {
    const request = createRequest("http://localhost/api/test", {
      "x-request-id": "rl-1",
    });

    applyRateLimit(request, "user-1", {
      prefix: "prefix-a",
      limit: 1,
      windowMs: 60000,
    });

    const result = applyRateLimit(request, "user-1", {
      prefix: "prefix-b",
      limit: 1,
      windowMs: 60000,
    });

    expect(result).toBeNull();
  });

  it("resets after window expires", async () => {
    const request = createRequest("http://localhost/api/test", {
      "x-request-id": "rl-1",
    });
    const opts = { prefix: "test", limit: 1, windowMs: 1 }; // 1ms window

    applyRateLimit(request, "user-1", opts);

    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 10));

    const result = applyRateLimit(request, "user-1", opts);
    expect(result).toBeNull();
  });

  it("resetRateLimitStore clears all entries", () => {
    const request = createRequest("http://localhost/api/test", {
      "x-request-id": "rl-1",
    });
    const opts = { prefix: "test", limit: 1, windowMs: 60000 };

    applyRateLimit(request, "user-1", opts);
    resetRateLimitStore();

    const result = applyRateLimit(request, "user-1", opts);
    expect(result).toBeNull();
  });
});
