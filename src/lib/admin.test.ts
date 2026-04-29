import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAdmin, requireCreator } from "./admin";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));
vi.mock("@/lib/creator", () => ({
  getComedianForUser: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { getComedianForUser } from "@/lib/creator";

describe("requireAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthorized when no session", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const result = await requireAdmin();

    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.reason).toBe("Not authenticated");
    }
  });

  it("returns unauthorized when user is not admin", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", role: "user", email: "test@example.com", name: "Test" },
      expires: "",
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: "user" } as never);

    const result = await requireAdmin();

    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.reason).toBe("Not authorized");
      expect(result.status).toBe(403);
    }
  });

  it("returns authorized with session when user is admin", async () => {
    const session = {
      user: { id: "admin-1", role: "admin", email: "admin@example.com", name: "Admin" },
      expires: "",
    };
    vi.mocked(getServerSession).mockResolvedValue(session);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: "admin" } as never);

    const result = await requireAdmin();

    expect(result.authorized).toBe(true);
    if (result.authorized) {
      expect(result.session).toBe(session);
    }
  });
});

describe("requireCreator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthorized when no session", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const result = await requireCreator();

    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.reason).toBe("Not authenticated");
      expect(result.status).toBe(401);
    }
  });

  it("returns forbidden when no approved comedian is linked", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", role: "user", email: "test@example.com", name: "Test" },
      expires: "",
    });
    vi.mocked(getComedianForUser).mockResolvedValue(null);

    const result = await requireCreator();

    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      expect(result.reason).toBe("Not authorized");
      expect(result.status).toBe(403);
    }
  });

  it("returns comedian context when the creator is linked", async () => {
    const session = {
      user: { id: "user-1", role: "user", email: "test@example.com", name: "Test" },
      expires: "",
    };
    const comedian = { id: "comedian-1", name: "Comic" };
    vi.mocked(getServerSession).mockResolvedValue(session);
    vi.mocked(getComedianForUser).mockResolvedValue(comedian as never);

    const result = await requireCreator();

    expect(result.authorized).toBe(true);
    if (result.authorized) {
      expect(result.session).toBe(session);
      expect(result.comedian).toBe(comedian);
    }
  });
});
