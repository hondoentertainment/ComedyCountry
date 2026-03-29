import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "./route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    venueReview: {
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/badges.achievement", () => ({
  checkAndAwardBadges: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/content-moderation", () => ({
  moderateContent: vi.fn().mockResolvedValue({ allowed: true }),
}));

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/venues/[id]/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns reviews with pagination and stats", async () => {
    const reviews = [{ id: "r1", rating: 5, comment: "Great venue" }];
    vi.mocked(prisma.venueReview.findMany).mockResolvedValue(reviews as any);
    vi.mocked(prisma.venueReview.count).mockResolvedValue(1);
    vi.mocked(prisma.venueReview.aggregate).mockResolvedValue({
      _avg: { rating: 4.5 },
      _count: 1,
    } as any);

    const req = new NextRequest("http://localhost/api/venues/v1/reviews");
    const res = await GET(req, makeParams("v1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.reviews).toHaveLength(1);
    expect(data.avgRating).toBe(4.5);
    expect(data.count).toBe(1);
    expect(data.page).toBe(1);
  });

  it("supports pagination", async () => {
    vi.mocked(prisma.venueReview.findMany).mockResolvedValue([]);
    vi.mocked(prisma.venueReview.count).mockResolvedValue(25);
    vi.mocked(prisma.venueReview.aggregate).mockResolvedValue({
      _avg: { rating: null },
      _count: 0,
    } as any);

    const req = new NextRequest(
      "http://localhost/api/venues/v1/reviews?page=3",
    );
    const res = await GET(req, makeParams("v1"));
    const data = await res.json();

    expect(data.page).toBe(3);
    expect(data.pages).toBe(3);
    expect(prisma.venueReview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
  });
});

describe("POST /api/venues/[id]/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/venues/v1/reviews", {
      method: "POST",
      body: JSON.stringify({ rating: 4 }),
    });
    const res = await POST(req, makeParams("v1"));

    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid rating", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });

    const req = new NextRequest("http://localhost/api/venues/v1/reviews", {
      method: "POST",
      body: JSON.stringify({ rating: 6 }),
    });
    const res = await POST(req, makeParams("v1"));

    expect(res.status).toBe(400);
  });

  it("creates review with valid data", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    const review = { id: "r1", rating: 4, venueId: "v1", userId: "u1" };
    vi.mocked(prisma.venueReview.upsert).mockResolvedValue(review as any);

    const req = new NextRequest("http://localhost/api/venues/v1/reviews", {
      method: "POST",
      body: JSON.stringify({ rating: 4, comment: "Nice place!" }),
    });
    const res = await POST(req, makeParams("v1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe("r1");
  });
});

describe("DELETE /api/venues/[id]/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/venues/v1/reviews", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("v1"));

    expect(res.status).toBe(401);
  });

  it("deletes the user's review", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(prisma.venueReview.deleteMany).mockResolvedValue({
      count: 1,
    } as any);

    const req = new NextRequest("http://localhost/api/venues/v1/reviews", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("v1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.venueReview.deleteMany).toHaveBeenCalledWith({
      where: { venueId: "v1", userId: "u1" },
    });
  });
});
