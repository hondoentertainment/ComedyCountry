import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("bcryptjs", () => ({
  compare: vi.fn(),
}));

vi.mock("@next-auth/prisma-adapter", () => ({
  PrismaAdapter: vi.fn(() => ({ mockAdapter: true })),
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn((config) => ({
    ...config,
    type: "credentials",
  })),
}));

vi.mock("next-auth/providers/google", () => ({
  default: vi.fn((config) => ({
    ...config,
    type: "oauth",
  })),
}));

import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { authOptions } from "./auth";

describe("authOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("configuration", () => {
    it("uses jwt session strategy", () => {
      expect(authOptions.session?.strategy).toBe("jwt");
    });

    it("sets session maxAge to 30 days in seconds", () => {
      const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
      expect(authOptions.session?.maxAge).toBe(thirtyDaysInSeconds);
    });

    it("has a custom sign-in page", () => {
      expect(authOptions.pages?.signIn).toBe("/auth/signin");
    });

    it("uses NEXTAUTH_SECRET from environment", () => {
      expect(authOptions.secret).toBe(process.env.NEXTAUTH_SECRET);
    });

    it("has a Prisma adapter", () => {
      expect(authOptions.adapter).toBeDefined();
    });

    it("has at least one provider (credentials)", () => {
      expect(authOptions.providers.length).toBeGreaterThanOrEqual(1);
    });

    it("has both jwt and session callbacks", () => {
      expect(authOptions.callbacks?.jwt).toBeDefined();
      expect(authOptions.callbacks?.session).toBeDefined();
    });
  });

  describe("credentials provider authorize", () => {
    function getAuthorize() {
      const credProvider = authOptions.providers.find(
        (p) => (p as { id?: string }).id === "credentials" || (p as { type?: string }).type === "credentials"
      ) as { authorize?: (creds: { username: string; password: string }) => Promise<unknown> } | undefined;
      return credProvider?.authorize;
    }

    it("returns null when both credentials are empty", async () => {
      const authorize = getAuthorize()!;
      const result = await authorize({ username: "", password: "" });
      expect(result).toBeNull();
    });

    it("returns null when username is empty", async () => {
      const authorize = getAuthorize()!;
      const result = await authorize({ username: "", password: "test123" });
      expect(result).toBeNull();
    });

    it("returns null when password is empty", async () => {
      const authorize = getAuthorize()!;
      const result = await authorize({ username: "test", password: "" });
      expect(result).toBeNull();
    });

    it("returns null when user is not found in database", async () => {
      const authorize = getAuthorize()!;
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await authorize({ username: "unknown", password: "pass" });
      expect(result).toBeNull();
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: "unknown" },
      });
    });

    it("returns null when user has no passwordHash (OAuth-only user)", async () => {
      const authorize = getAuthorize()!;
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u1",
        username: "oauthuser",
        passwordHash: null,
      } as never);

      const result = await authorize({ username: "oauthuser", password: "pass" });
      expect(result).toBeNull();
      expect(compare).not.toHaveBeenCalled();
    });

    it("returns null when password comparison fails", async () => {
      const authorize = getAuthorize()!;
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u1",
        username: "testuser",
        passwordHash: "$2a$12$hash",
        name: "Test",
        email: "test@test.com",
        image: null,
        role: "user",
      } as never);
      vi.mocked(compare).mockResolvedValue(false as never);

      const result = await authorize({ username: "testuser", password: "wrong" });
      expect(result).toBeNull();
      expect(compare).toHaveBeenCalledWith("wrong", "$2a$12$hash");
    });

    it("returns user object on successful authentication", async () => {
      const authorize = getAuthorize()!;
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u1",
        username: "testuser",
        passwordHash: "$2a$12$hash",
        name: "Test User",
        email: "test@test.com",
        image: "https://example.com/photo.jpg",
        role: "admin",
      } as never);
      vi.mocked(compare).mockResolvedValue(true as never);

      const result = await authorize({ username: "testuser", password: "correct" });

      expect(result).toEqual({
        id: "u1",
        name: "Test User",
        email: "test@test.com",
        image: "https://example.com/photo.jpg",
        role: "admin",
      });
    });

    it("uses username as name fallback when name is null", async () => {
      const authorize = getAuthorize()!;
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u1",
        username: "fallbackuser",
        passwordHash: "$2a$12$hash",
        name: null,
        email: null,
        image: null,
        role: "user",
      } as never);
      vi.mocked(compare).mockResolvedValue(true as never);

      const result = await authorize({ username: "fallbackuser", password: "pass" }) as { name: string };
      expect(result.name).toBe("fallbackuser");
    });

    it("returns undefined for null email and image", async () => {
      const authorize = getAuthorize()!;
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u1",
        username: "testuser",
        passwordHash: "$2a$12$hash",
        name: "Test",
        email: null,
        image: null,
        role: "user",
      } as never);
      vi.mocked(compare).mockResolvedValue(true as never);

      const result = await authorize({ username: "testuser", password: "pass" }) as { email: unknown; image: unknown };
      expect(result.email).toBeUndefined();
      expect(result.image).toBeUndefined();
    });
  });

  describe("jwt callback", () => {
    it("adds id and role from user to token during sign-in", async () => {
      const jwt = authOptions.callbacks!.jwt!;
      const result = await jwt({
        token: { sub: "u1" },
        user: { id: "u1", role: "admin" },
      } as never);

      expect(result).toMatchObject({ id: "u1", role: "admin" });
    });

    it("defaults role to user when not provided", async () => {
      const jwt = authOptions.callbacks!.jwt!;
      const result = await jwt({
        token: { sub: "u1" },
        user: { id: "u1" },
      } as never);

      expect(result).toMatchObject({ role: "user" });
    });

    it("does not modify token when user is not present (subsequent calls)", async () => {
      const jwt = authOptions.callbacks!.jwt!;
      const existingToken = { sub: "u1", id: "u1", role: "admin" };
      const result = await jwt({
        token: existingToken,
        user: undefined,
      } as never);

      expect(result).toEqual(existingToken);
    });
  });

  describe("session callback", () => {
    it("adds id and role from token to session user", async () => {
      const session = authOptions.callbacks!.session!;
      const result = await session({
        session: { user: { name: "Test", email: "test@test.com" } },
        token: { id: "u1", role: "admin" },
      } as never);

      const user = result.user as { id?: string; role?: string };
      expect(user.id).toBe("u1");
      expect(user.role).toBe("admin");
    });

    it("defaults role to user when token has no role", async () => {
      const session = authOptions.callbacks!.session!;
      const result = await session({
        session: { user: { name: "Test" } },
        token: { id: "u1" },
      } as never);

      const user = result.user as { role?: string };
      expect(user.role).toBe("user");
    });

    it("preserves existing session fields", async () => {
      const session = authOptions.callbacks!.session!;
      const result = await session({
        session: {
          user: { name: "Test", email: "test@test.com", image: "pic.jpg" },
          expires: "2025-12-31",
        },
        token: { id: "u1", role: "user" },
      } as never);

      expect(result.user).toMatchObject({
        name: "Test",
        email: "test@test.com",
      });
    });
  });
});
