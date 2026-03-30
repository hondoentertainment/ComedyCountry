import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "./route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    specialRating: {
      aggregate: vi.fn(),
      findUnique: vi.fn(),
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

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/specials/[id]/rate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns aggregate stats and user rating", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(prisma.specialRating.aggregate).mockResolvedValue({
      _avg: { rating: 4.0 },
      _count: 5,
    } as any);
    vi.mocked(prisma.specialRating.findUnique).mockResolvedValue({
      rating: 4,
    } as any);

    const req = new NextRequest("http://localhost/api/specials/s1/rate");
    const res = await GET(req, makeParams("s1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.avgRating).toBe(4.0);
    expect(data.count).toBe(5);
    expect(data.userRating).toBe(4);
  });

  it("returns null userRating when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(prisma.specialRating.aggregate).mockResolvedValue({
      _avg: { rating: 3.5 },
      _count: 2,
    } as any);

    const req = new NextRequest("http://localhost/api/specials/s1/rate");
    const res = await GET(req, makeParams("s1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.userRating).toBeNull();
  });
});

describe("POST /api/specials/[id]/rate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/specials/s1/rate", {
      method: "POST",
      body: JSON.stringify({ rating: 4 }),
    });
    const res = await POST(req, makeParams("s1"));

    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid rating", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });

    const req = new NextRequest("http://localhost/api/specials/s1/rate", {
      method: "POST",
      body: JSON.stringify({ rating: 0 }),
    });
    const res = await POST(req, makeParams("s1"));

    expect(res.status).toBe(400);
  });

  it("creates rating with valid data", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    const result = { id: "sr1", specialId: "s1", userId: "u1", rating: 5 };
    vi.mocked(prisma.specialRating.upsert).mockResolvedValue(result as any);

    const req = new NextRequest("http://localhost/api/specials/s1/rate", {
      method: "POST",
      body: JSON.stringify({ rating: 5 }),
    });
    const res = await POST(req, makeParams("s1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.rating).toBe(5);
  });
});

describe("DELETE /api/specials/[id]/rate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/specials/s1/rate", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("s1"));

    expect(res.status).toBe(401);
  });

  it("deletes the user's rating", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(prisma.specialRating.deleteMany).mockResolvedValue({
      count: 1,
    } as any);

    const req = new NextRequest("http://localhost/api/specials/s1/rate", {
      method: "DELETE",
    });
    const res = await DELETE(req, makeParams("s1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
