import {
  applyRequestContextHeaders,
  getCorrelationId,
  getRequestContext,
  getRequestId,
} from "@/lib/request-context";

describe("request-context", () => {
  it("preserves incoming request and correlation ids", () => {
    const request = new Request("https://example.com/api/test", {
      method: "POST",
      headers: {
        "x-request-id": "req-123",
        "x-correlation-id": "corr-456",
        "x-forwarded-for": "203.0.113.10",
      },
    });

    expect(getRequestId(request)).toBe("req-123");
    expect(getCorrelationId(request)).toBe("corr-456");

    expect(getRequestContext(request)).toMatchObject({
      requestId: "req-123",
      correlationId: "corr-456",
      method: "POST",
      path: "/api/test",
      clientAddress: "203.0.113.10",
    });
  });

  it("generates ids and applies them to responses when missing", () => {
    const request = new Request("https://example.com/api/test");
    const response = applyRequestContextHeaders(new Response("ok"), request);

    expect(getRequestId(request)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(response.headers.get("x-correlation-id")).toBeTruthy();
  });
});
