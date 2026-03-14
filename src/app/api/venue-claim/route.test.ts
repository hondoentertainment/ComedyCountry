import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    venue: { findUnique: vi.fn() },
    venueClaim: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { POST, GET } from "./route";

const session = { user: { id: "user-1" } };

beforeEach(() => vi.clearAllMocks());

describe("POST /api/venue-claim", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ venueId: "v1" }),
    }));
    expect(res.status).toBe(401);
  });

  it("returns 404 for non-existent venue", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    vi.mocked(prisma.venue.findUnique).mockResolvedValue(null);

    const res = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ venueId: "v1" }),
    }));
    expect(res.status).toBe(404);
  });

  it("creates a venue claim successfully", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    vi.mocked(prisma.venue.findUnique).mockResolvedValue({ id: "v1" } as never);
    vi.mocked(prisma.venueClaim.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.venueClaim.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.venueClaim.create).mockResolvedValue({ id: "claim1", status: "PENDING" } as never);

    const res = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ venueId: "v1", proofUrl: "https://example.com" }),
    }));
    expect(res.status).toBe(201);
  });

  it("prevents duplicate claims", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    vi.mocked(prisma.venue.findUnique).mockResolvedValue({ id: "v1" } as never);
    vi.mocked(prisma.venueClaim.findUnique).mockResolvedValue({ status: "PENDING" } as never);

    const res = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ venueId: "v1" }),
    }));
    expect(res.status).toBe(409);
  });
});

describe("GET /api/venue-claim", () => {
  it("returns user claims", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    vi.mocked(prisma.venueClaim.findMany).mockResolvedValue([
      { id: "c1", venueId: "v1", status: "PENDING" },
    ] as never);

    const res = await GET();
    const data = await res.json();
    expect(data).toHaveLength(1);
  });
});
