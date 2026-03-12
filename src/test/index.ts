/**
 * Test Harness — Barrel Export
 *
 * Import everything from "@/test" for a batteries-included test setup.
 *
 * Usage:
 *   import { createMockPrisma, factories, req, assertOk } from "@/test";
 */

export { createMockPrisma, resetMockPrisma, type MockPrismaClient } from "./mock-prisma";
export {
  setupAuthMocks,
  mockSession,
  mockNoSession,
  mockAdminSession,
  mockVenueOwnerSession,
  AUTH_MOCK_MODULES,
  type MockUser,
  type MockSessionData,
} from "./mock-auth";
export { req, parseResponse, routeParams, type TestRequest } from "./request-builder";
export { factories, resetFactoryCounter } from "./factories";
export {
  assertJsonResponse,
  assertOk,
  assertCreated,
  assertError,
  assertBadRequest,
  assertUnauthorized,
  assertForbidden,
  assertNotFound,
  assertServerError,
  assertPaginated,
  assertThrowsAsync,
  testAuthGuard,
} from "./api-helpers";
