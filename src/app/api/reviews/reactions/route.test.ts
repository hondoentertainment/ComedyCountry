import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    reviewReaction: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { POST, GET } from "./route";

const session = { user: { id: "user-1" } };

beforeEach(() => vi.clearAllMocks());

describe("POST /api/reviews/reactions", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ reviewType: "event_review", reviewId: "r1", reactionType: "helpful" }),
    }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid reaction type", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    const res = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ reviewType: "event_review", reviewId: "r1", reactionType: "invalid" }),
    }));
    expect(res.status).toBe(400);
  });

  it("adds a new reaction", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    vi.mocked(prisma.reviewReaction.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.reviewReaction.create).mockResolvedValue({} as never);

    const res = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ reviewType: "event_review", reviewId: "r1", reactionType: "helpful" }),
    }));
    const data = await res.json();
    expect(data.action).toBe("added");
  });

  it("toggles off existing reaction", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    vi.mocked(prisma.reviewReaction.findUnique).mockResolvedValue({
      id: "rx1",
      reactionType: "helpful",
    } as never);
    vi.mocked(prisma.reviewReaction.delete).mockResolvedValue({} as never);

    const res = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ reviewType: "event_review", reviewId: "r1", reactionType: "helpful" }),
    }));
    const data = await res.json();
    expect(data.action).toBe("removed");
  });
});

describe("GET /api/reviews/reactions", () => {
  it("returns reaction counts", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(prisma.reviewReaction.findMany).mockResolvedValue([
      { reactionType: "helpful", userId: "u1" },
      { reactionType: "helpful", userId: "u2" },
      { reactionType: "funny", userId: "u3" },
    ] as never);

    const res = await GET(new Request("http://localhost/api/reviews/reactions?reviewType=event_review&reviewId=r1"));
    const data = await res.json();
    expect(data.helpful).toBe(2);
    expect(data.funny).toBe(1);
    expect(data.userReaction).toBeNull();
  });
});
