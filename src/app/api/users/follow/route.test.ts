import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    userFollow: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    activityFeedItem: { create: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { POST, GET } from "./route";

const session = { user: { id: "user-1" } };

beforeEach(() => vi.clearAllMocks());

describe("POST /api/users/follow", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ userId: "user-2" }),
    }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when trying to follow self", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    const res = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ userId: "user-1" }),
    }));
    expect(res.status).toBe(400);
  });

  it("creates a follow when not already following", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    vi.mocked(prisma.userFollow.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.userFollow.create).mockResolvedValue({ id: "follow-1" } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ name: "Test" } as never);
    vi.mocked(prisma.activityFeedItem.create).mockResolvedValue({} as never);

    const res = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ userId: "user-2" }),
    }));
    const data = await res.json();
    expect(data.following).toBe(true);
    expect(prisma.userFollow.create).toHaveBeenCalled();
  });

  it("deletes a follow when already following", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    vi.mocked(prisma.userFollow.findUnique).mockResolvedValue({ id: "follow-1" } as never);
    vi.mocked(prisma.userFollow.delete).mockResolvedValue({} as never);

    const res = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ userId: "user-2" }),
    }));
    const data = await res.json();
    expect(data.following).toBe(false);
  });
});

describe("GET /api/users/follow", () => {
  it("returns follow counts", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    vi.mocked(prisma.userFollow.count).mockResolvedValue(5 as never);
    vi.mocked(prisma.userFollow.findUnique).mockResolvedValue(null as never);

    const res = await GET(new Request("http://localhost/api/users/follow?userId=user-2"));
    const data = await res.json();
    expect(data.followersCount).toBe(5);
    expect(data.isFollowing).toBe(false);
  });

  it("returns 400 without userId", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    const res = await GET(new Request("http://localhost/api/users/follow"));
    expect(res.status).toBe(400);
  });
});
