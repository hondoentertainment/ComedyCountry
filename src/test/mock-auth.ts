/**
 * Auth Mock Helpers
 *
 * Simplifies mocking next-auth sessions in API route tests.
 *
 * Usage:
 *   import { mockSession, mockNoSession, setupAuthMocks } from "@/test/mock-auth";
 *
 *   // In vi.mock block or beforeEach:
 *   mockSession({ id: "u1", email: "test@example.com", role: "admin" });
 *   mockNoSession();  // simulate unauthenticated
 */

import { vi } from "vitest";

export interface MockUser {
  id: string;
  email?: string;
  name?: string;
  role?: string;
  image?: string;
}

export interface MockSessionData {
  user: MockUser;
  expires?: string;
}

let getServerSessionMock: ReturnType<typeof vi.fn> | null = null;

/**
 * Call this once at the top of your test file AFTER vi.mock("next-auth").
 * Captures the mocked getServerSession for subsequent calls.
 *
 * Returns the mock function for direct use if needed.
 */
export function setupAuthMocks(): ReturnType<typeof vi.fn> {
  // eslint-disable-next-line no-restricted-syntax -- dynamic require for mock
  const { getServerSession } = require("next-auth");
  getServerSessionMock = vi.mocked(getServerSession) as any;
  return getServerSessionMock!;
}

/**
 * Sets the session to return an authenticated user.
 * Accepts a partial user — defaults are filled in.
 */
export function mockSession(user: Partial<MockUser> = {}): MockSessionData {
  const session: MockSessionData = {
    user: {
      id: user.id ?? "test-user-1",
      email: user.email ?? "test@example.com",
      name: user.name ?? "Test User",
      role: user.role ?? "user",
      ...user,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  if (getServerSessionMock) {
    getServerSessionMock.mockResolvedValue(session);
  }

  return session;
}

/**
 * Sets the session to null (unauthenticated).
 */
export function mockNoSession(): void {
  if (getServerSessionMock) {
    getServerSessionMock.mockResolvedValue(null);
  }
}

/**
 * Sets the session to return an admin user.
 */
export function mockAdminSession(
  overrides: Partial<MockUser> = {}
): MockSessionData {
  return mockSession({
    id: "admin-1",
    email: "admin@example.com",
    name: "Admin User",
    role: "admin",
    ...overrides,
  });
}

/**
 * Sets the session to return a venue owner.
 */
export function mockVenueOwnerSession(
  overrides: Partial<MockUser> = {}
): MockSessionData {
  return mockSession({
    id: "owner-1",
    email: "owner@venue.com",
    name: "Venue Owner",
    role: "venue_owner",
    ...overrides,
  });
}

/**
 * Standard vi.mock declarations for auth modules.
 * Use these strings with vi.mock() at the top of your test file.
 *
 * Example:
 *   vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
 *   vi.mock("@/lib/auth", () => ({ authOptions: {} }));
 */
export const AUTH_MOCK_MODULES = {
  "next-auth": () => ({ getServerSession: vi.fn() }),
  "@/lib/auth": () => ({ authOptions: {} }),
} as const;
