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
  PrismaAdapter: vi.fn(() => ({})),
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
import { authOptions } from "@/lib/auth";

describe("Auth Configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authOptions structure", () => {
    it("uses jwt session strategy", () => {
      expect(authOptions.session?.strategy).toBe("jwt");
    });

    it("sets session maxAge to 30 days", () => {
      expect(authOptions.session?.maxAge).toBe(30 * 24 * 60 * 60);
    });

    it("configures custom sign-in page", () => {
      expect(authOptions.pages?.signIn).toBe("/auth/signin");
    });

    it("uses NEXTAUTH_SECRET from environment", () => {
      expect(authOptions.secret).toBe(process.env.NEXTAUTH_SECRET);
    });

    it("has credentials provider", () => {
      const providers = authOptions.providers;
      const credProvider = providers.find(
        (p) => (p as { id?: string }).id === "credentials" || (p as { type?: string }).type === "credentials"
      );
      expect(credProvider).toBeDefined();
    });

    it("has an adapter", () => {
      expect(authOptions.adapter).toBeDefined();
    });
  });

  describe("credentials authorize", () => {
    const getAuthorize = () => {
      const providers = authOptions.providers;
      const credProvider = providers.find(
        (p) => (p as { id?: string }).id === "credentials" || (p as { type?: string }).type === "credentials"
      ) as { authorize?: (creds: { username: string; password: string }) => Promise<unknown> } | undefined;
      return credProvider?.authorize;
    };

    it("returns null when credentials are missing", async () => {
      const authorize = getAuthorize();
      if (!authorize) throw new Error("authorize not found");

      const result = await authorize({ username: "", password: "" });
      expect(result).toBeNull();
    });

    it("returns null when username is missing", async () => {
      const authorize = getAuthorize();
      if (!authorize) throw new Error("authorize not found");

      const result = await authorize({ username: "", password: "password123" });
      expect(result).toBeNull();
    });

    it("returns null when password is missing", async () => {
      const authorize = getAuthorize();
      if (!authorize) throw new Error("authorize not found");

      const result = await authorize({ username: "testuser", password: "" });
      expect(result).toBeNull();
    });

    it("returns null when user not found in database", async () => {
      const authorize = getAuthorize();
      if (!authorize) throw new Error("authorize not found");

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await authorize({
        username: "nonexistent",
        password: "password123",
      });
      expect(result).toBeNull();
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: "nonexistent" },
      });
    });

    it("returns null when user has no password hash", async () => {
      const authorize = getAuthorize();
      if (!authorize) throw new Error("authorize not found");

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u1",
        username: "testuser",
        passwordHash: null,
      } as never);

      const result = await authorize({
        username: "testuser",
        password: "password123",
      });
      expect(result).toBeNull();
    });

    it("returns null when password does not match", async () => {
      const authorize = getAuthorize();
      if (!authorize) throw new Error("authorize not found");

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u1",
        username: "testuser",
        passwordHash: "hashed",
        name: "Test User",
        email: "test@example.com",
        image: null,
        role: "user",
      } as never);
      vi.mocked(compare).mockResolvedValue(false as never);

      const result = await authorize({
        username: "testuser",
        password: "wrongpassword",
      });
      expect(result).toBeNull();
      expect(compare).toHaveBeenCalledWith("wrongpassword", "hashed");
    });

    it("returns user object when credentials are valid", async () => {
      const authorize = getAuthorize();
      if (!authorize) throw new Error("authorize not found");

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u1",
        username: "testuser",
        passwordHash: "hashed",
        name: "Test User",
        email: "test@example.com",
        image: "https://example.com/avatar.jpg",
        role: "admin",
      } as never);
      vi.mocked(compare).mockResolvedValue(true as never);

      const result = await authorize({
        username: "testuser",
        password: "correctpassword",
      });

      expect(result).toEqual({
        id: "u1",
        name: "Test User",
        email: "test@example.com",
        image: "https://example.com/avatar.jpg",
        role: "admin",
      });
    });

    it("uses username as name fallback when name is null", async () => {
      const authorize = getAuthorize();
      if (!authorize) throw new Error("authorize not found");

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u1",
        username: "testuser",
        passwordHash: "hashed",
        name: null,
        email: null,
        image: null,
        role: "user",
      } as never);
      vi.mocked(compare).mockResolvedValue(true as never);

      const result = await authorize({
        username: "testuser",
        password: "correctpassword",
      }) as { name: string };

      expect(result.name).toBe("testuser");
    });
  });

  describe("jwt callback", () => {
    it("adds user id and role to token on sign in", async () => {
      const jwt = authOptions.callbacks?.jwt;
      if (!jwt) throw new Error("jwt callback not found");

      const result = await jwt({
        token: { sub: "u1" },
        user: { id: "u1", role: "admin" },
      } as never);

      expect(result).toEqual(
        expect.objectContaining({
          id: "u1",
          role: "admin",
        })
      );
    });

    it("preserves existing token when user is not present", async () => {
      const jwt = authOptions.callbacks?.jwt;
      if (!jwt) throw new Error("jwt callback not found");

      const result = await jwt({
        token: { sub: "u1", id: "u1", role: "admin" },
        user: undefined,
      } as never);

      expect(result).toEqual(
        expect.objectContaining({ id: "u1", role: "admin" })
      );
    });

    it("defaults role to user when not provided", async () => {
      const jwt = authOptions.callbacks?.jwt;
      if (!jwt) throw new Error("jwt callback not found");

      const result = await jwt({
        token: { sub: "u1" },
        user: { id: "u1" },
      } as never);

      expect(result).toEqual(
        expect.objectContaining({ role: "user" })
      );
    });
  });

  describe("session callback", () => {
    it("adds user id and role to session", async () => {
      const sessionCb = authOptions.callbacks?.session;
      if (!sessionCb) throw new Error("session callback not found");

      const result = await sessionCb({
        session: { user: { name: "Test", email: "test@example.com" } },
        token: { id: "u1", role: "admin" },
      } as never);

      expect(result.user).toEqual(
        expect.objectContaining({
          id: "u1",
          role: "admin",
        })
      );
    });

    it("defaults role to user when token has no role", async () => {
      const sessionCb = authOptions.callbacks?.session;
      if (!sessionCb) throw new Error("session callback not found");

      const result = await sessionCb({
        session: { user: { name: "Test" } },
        token: { id: "u1" },
      } as never);

      expect((result.user as { role?: string }).role).toBe("user");
    });
  });
});

describe("Auth Route Exports", () => {
  it("exports GET and POST handlers", async () => {
    const routeModule = await import("./route");
    expect(routeModule.GET).toBeDefined();
    expect(routeModule.POST).toBeDefined();
  });
});
