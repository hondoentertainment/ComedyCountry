import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

describe("GET /api/subscriptions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns free plan when no subscription", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);
    const res = await GET();
    const data = await res.json();
    expect(data.plan).toBe("free");
    expect(data.features.adFree).toBe(false);
  });

  it("returns active subscription with features", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      plan: "FAN_PRO",
      status: "ACTIVE",
      currentPeriodEnd: new Date("2026-04-01"),
      cancelAtPeriodEnd: false,
    } as never);
    const res = await GET();
    const data = await res.json();
    expect(data.plan).toBe("FAN_PRO");
    expect(data.features.adFree).toBe(true);
    expect(data.features.analytics).toBe(false);
  });
});

describe("POST /api/subscriptions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/subscriptions", {
      method: "POST",
      body: JSON.stringify({ plan: "FAN_PRO" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid plan", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    const req = new NextRequest("http://localhost/api/subscriptions", {
      method: "POST",
      body: JSON.stringify({ plan: "INVALID_PLAN" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("creates subscription for valid plan", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(prisma.subscription.upsert).mockResolvedValue({
      id: "sub1", userId: "u1", plan: "COMEDIAN_PRO", status: "ACTIVE",
    } as never);
    const req = new NextRequest("http://localhost/api/subscriptions", {
      method: "POST",
      body: JSON.stringify({ plan: "COMEDIAN_PRO" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.features.analytics).toBe(true);
    expect(data.features.verifiedBadge).toBe(true);
  });
});
