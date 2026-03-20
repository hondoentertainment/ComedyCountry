/**
 * API Route Test Helpers
 *
 * Reusable assertions and patterns for testing Next.js API route handlers.
 *
 * Usage:
 *   import { assertJsonResponse, assertError, assertCreated } from "@/test/api-helpers";
 *
 *   const res = await GET(req);
 *   await assertJsonResponse(res, 200, (data) => {
 *     expect(data).toHaveLength(3);
 *   });
 *
 *   await assertError(res, 401, "Unauthorized");
 */

import { expect, it } from "vitest";

/**
 * Assert response status and optionally inspect JSON body.
 */
export async function assertJsonResponse<T = unknown>(
  response: Response,
  expectedStatus: number,
  bodyAssertions?: (data: T) => void
): Promise<T> {
  expect(response.status).toBe(expectedStatus);
  const data = (await response.json()) as T;
  if (bodyAssertions) {
    bodyAssertions(data);
  }
  return data;
}

/**
 * Assert a successful 200 response with JSON body.
 */
export async function assertOk<T = unknown>(
  response: Response,
  bodyAssertions?: (data: T) => void
): Promise<T> {
  return assertJsonResponse(response, 200, bodyAssertions);
}

/**
 * Assert a 201 Created response.
 */
export async function assertCreated<T = unknown>(
  response: Response,
  bodyAssertions?: (data: T) => void
): Promise<T> {
  return assertJsonResponse(response, 201, bodyAssertions);
}

/**
 * Assert an error response with status and optional message check.
 */
export async function assertError(
  response: Response,
  expectedStatus: number,
  messageContains?: string
): Promise<void> {
  expect(response.status).toBe(expectedStatus);
  if (messageContains) {
    const data = await response.json();
    const message =
      data.error || data.message || data.detail || JSON.stringify(data);
    expect(message).toContain(messageContains);
  }
}

/**
 * Assert a 400 Bad Request response.
 */
export async function assertBadRequest(
  response: Response,
  messageContains?: string
): Promise<void> {
  return assertError(response, 400, messageContains);
}

/**
 * Assert a 401 Unauthorized response.
 */
export async function assertUnauthorized(
  response: Response,
  messageContains?: string
): Promise<void> {
  return assertError(response, 401, messageContains ?? "Unauthorized");
}

/**
 * Assert a 403 Forbidden response.
 */
export async function assertForbidden(
  response: Response,
  messageContains?: string
): Promise<void> {
  return assertError(response, 403, messageContains);
}

/**
 * Assert a 404 Not Found response.
 */
export async function assertNotFound(
  response: Response,
  messageContains?: string
): Promise<void> {
  return assertError(response, 404, messageContains);
}

/**
 * Assert a 500 Internal Server Error response.
 */
export async function assertServerError(
  response: Response,
  messageContains?: string
): Promise<void> {
  return assertError(response, 500, messageContains);
}

/**
 * Assert response contains pagination metadata.
 */
export async function assertPaginated<T = unknown>(
  response: Response,
  assertions?: {
    page?: number;
    total?: number;
    itemCount?: number;
  }
): Promise<{ items: T[]; page: number; total: number }> {
  expect(response.status).toBe(200);
  const data = await response.json();

  // Check common pagination shapes
  const items = data.items || data.data || data.results || data;
  expect(Array.isArray(items)).toBe(true);

  if (assertions?.itemCount !== undefined) {
    expect(items).toHaveLength(assertions.itemCount);
  }
  if (assertions?.page !== undefined) {
    expect(data.page ?? data.currentPage).toBe(assertions.page);
  }
  if (assertions?.total !== undefined) {
    expect(data.total ?? data.totalCount).toBe(assertions.total);
  }

  return data;
}

/**
 * Assert that a lib function throws with a specific message.
 */
export async function assertThrowsAsync(
  fn: () => Promise<unknown>,
  messageContains: string
): Promise<void> {
  await expect(fn()).rejects.toThrow(messageContains);
}

/**
 * Batch test runner for common auth-gated patterns.
 * Tests that all specified HTTP methods return 401 without a session.
 *
 * Usage:
 *   testAuthGuard({
 *     GET: () => GET(req.get("/api/events")),
 *     POST: () => POST(req.post("/api/events", {})),
 *   });
 */
export function testAuthGuard(
  handlers: Record<string, () => Promise<Response>>
): void {
  for (const [method, handler] of Object.entries(handlers)) {
    it(`${method} returns 401 without session`, async () => {
      const response = await handler();
      expect(response.status).toBe(401);
    });
  }
}
