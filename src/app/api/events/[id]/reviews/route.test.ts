import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: { findUnique: vi.fn() },
    eventReview: { upsert: vi.fn() },
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/event-reviews", () => ({
  getEventReviewsSorted: vi.fn(),
  getEventRatingStats: vi.fn(),
}));

vi.mock("@/lib/badges.achievement", () => ({
  checkAndAwardBadges: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/live-reputation", () => ({
  hasVerifiedAttendance: vi.fn(),
  normalizeExperienceInput: vi.fn().mockReturnValue(null),
  upsertEventExperienceFeedback: vi.fn(),
}));

vi.mock("@/lib/content-moderation", () => ({
  moderateContent: vi.fn().mockResolvedValue({ allowed: true }),
}));

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import {
  getEventReviewsSorted,
  getEventRatingStats,
} from "@/lib/event-reviews";
import { hasVerifiedAttendance } from "@/lib/live-reputation";

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/events/[id]/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns reviews with pagination and stats", async () => {
    vi.mocked(getEventRatingStats).mockResolvedValue({
      averageRating: 4.2,
      totalRatings: 10,
    } as any);
    vi.mocked(getEventReviewsSorted).mockResolvedValue({
      reviews: [{ id: "r1", rating: 5 }],
      total: 1,
    } as any);

    const req = new NextRequest("http://localhost/api/events/e1/reviews");
    const res = await GET(req, makeParams("e1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.reviews).toHaveLength(1);
    expect(data.total).toBe(1);
    expect(data.page).toBe(1);
    expect(data.pages).toBe(1);
    expect(data.averageRating).toBe(4.2);
  });

  it("passes page parameter", async () => {
    vi.mocked(getEventRatingStats).mockResolvedValue({} as any);
    vi.mocked(getEventReviewsSorted).mockResolvedValue({
      reviews: [],
      total: 25,
    } as any);

    const req = new NextRequest(
      "http://localhost/api/events/e1/reviews?page=3",
    );
    await GET(req, makeParams("e1"));

    expect(getEventReviewsSorted).toHaveBeenCalledWith("e1", 10, 20, "recent");
  });

  it("returns 500 on error", async () => {
    vi.mocked(getEventRatingStats).mockRejectedValue(new Error("DB error"));

    const req = new NextRequest("http://localhost/api/events/e1/reviews");
    const res = await GET(req, makeParams("e1"));

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Failed to load reviews");
  });
});

describe("POST /api/events/[id]/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/events/e1/reviews", {
      method: "POST",
      body: JSON.stringify({ rating: 4 }),
    });
    const res = await POST(req, makeParams("e1"));

    expect(res.status).toBe(401);
  });

  it("returns 404 when event not found", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(prisma.event.findUnique).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/events/e1/reviews", {
      method: "POST",
      body: JSON.stringify({ rating: 4 }),
    });
    const res = await POST(req, makeParams("e1"));

    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid rating", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "e1" } as any);

    const req = new NextRequest("http://localhost/api/events/e1/reviews", {
      method: "POST",
      body: JSON.stringify({ rating: 6 }),
    });
    const res = await POST(req, makeParams("e1"));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Rating must be between");
  });

  it("returns 400 when no rating, comment, or experience", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "e1" } as any);

    const req = new NextRequest("http://localhost/api/events/e1/reviews", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req, makeParams("e1"));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Provide rating, comment, or crowd feedback");
  });

  it("creates review with valid rating", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "e1" } as any);
    vi.mocked(hasVerifiedAttendance).mockResolvedValue(true);
    const review = { id: "r1", rating: 4, userId: "u1", eventId: "e1" };
    vi.mocked(prisma.eventReview.upsert).mockResolvedValue(review as any);

    const req = new NextRequest("http://localhost/api/events/e1/reviews", {
      method: "POST",
      body: JSON.stringify({ rating: 4, comment: "Great show!" }),
    });
    const res = await POST(req, makeParams("e1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe("r1");
    expect(prisma.eventReview.upsert).toHaveBeenCalled();
  });

  it("returns 400 for invalid JSON", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "e1" } as any);

    const req = new NextRequest("http://localhost/api/events/e1/reviews", {
      method: "POST",
      body: "not json",
    });
    const res = await POST(req, makeParams("e1"));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid JSON");
  });

  it("returns 500 when upsert fails", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "e1" } as any);
    vi.mocked(hasVerifiedAttendance).mockRejectedValue(new Error("DB error"));

    const req = new NextRequest("http://localhost/api/events/e1/reviews", {
      method: "POST",
      body: JSON.stringify({ rating: 4 }),
    });
    const res = await POST(req, makeParams("e1"));

    expect(res.status).toBe(500);
  });
});
