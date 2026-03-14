/**
 * Request Builder
 *
 * Fluent API for constructing test requests for Next.js API route handlers.
 *
 * Usage:
 *   import { req } from "@/test/request-builder";
 *
 *   const request = req.get("/api/events?page=1");
 *   const request = req.post("/api/events", { title: "Show" });
 *   const request = req.patch("/api/events/1", { title: "Updated" });
 *   const request = req.delete("/api/events/1");
 *
 *   // With custom headers:
 *   const request = req.get("/api/events").withHeaders({ Authorization: "Bearer tok" });
 *
 *   // Full builder:
 *   const request = req.build("/api/events")
 *     .method("POST")
 *     .json({ title: "Show" })
 *     .header("X-Custom", "value")
 *     .query({ venueId: "v1" })
 *     .done();
 */

const BASE = "http://localhost";

export interface TestRequest extends Request {
  withHeaders(headers: Record<string, string>): TestRequest;
}

function createRequest(
  path: string,
  method: string,
  body?: unknown,
  extraHeaders?: Record<string, string>
): TestRequest {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };

  const init: RequestInit = {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  const request = new Request(url, init) as TestRequest;

  request.withHeaders = (moreHeaders: Record<string, string>) => {
    return createRequest(
      path,
      method,
      body,
      { ...extraHeaders, ...moreHeaders }
    );
  };

  return request;
}

/**
 * Request builder with shorthand methods.
 */
export const req = {
  get(path: string): TestRequest {
    return createRequest(path, "GET");
  },

  post(path: string, body?: unknown): TestRequest {
    return createRequest(path, "POST", body);
  },

  put(path: string, body?: unknown): TestRequest {
    return createRequest(path, "PUT", body);
  },

  patch(path: string, body?: unknown): TestRequest {
    return createRequest(path, "PATCH", body);
  },

  delete(path: string, body?: unknown): TestRequest {
    return createRequest(path, "DELETE", body);
  },

  /**
   * Full builder for complex requests.
   */
  build(path: string) {
    let _method = "GET";
    let _body: unknown;
    const _headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const _query: Record<string, string> = {};

    const builder = {
      method(m: string) {
        _method = m;
        return builder;
      },
      json(data: unknown) {
        _body = data;
        return builder;
      },
      header(key: string, value: string) {
        _headers[key] = value;
        return builder;
      },
      headers(h: Record<string, string>) {
        Object.assign(_headers, h);
        return builder;
      },
      query(params: Record<string, string | number | boolean>) {
        for (const [k, v] of Object.entries(params)) {
          _query[k] = String(v);
        }
        return builder;
      },
      done(): TestRequest {
        let url = path.startsWith("http") ? path : `${BASE}${path}`;
        if (Object.keys(_query).length > 0) {
          const qs = new URLSearchParams(_query).toString();
          url += (url.includes("?") ? "&" : "?") + qs;
        }
        return createRequest(url, _method, _body, _headers);
      },
    };

    return builder;
  },
};

/**
 * Parse a JSON response and return { status, data }.
 * Convenience for route handler testing.
 */
export async function parseResponse<T = unknown>(
  response: Response
): Promise<{ status: number; data: T }> {
  const data = (await response.json()) as T;
  return { status: response.status, data };
}

/**
 * Build Next.js route handler params object.
 * Used for dynamic routes like [id], [slug], etc.
 *
 * Usage:
 *   const res = await GET(req, routeParams({ id: "abc" }));
 */
export function routeParams(
  params: Record<string, string>
): { params: Promise<Record<string, string>> } {
  return { params: Promise.resolve(params) };
}
