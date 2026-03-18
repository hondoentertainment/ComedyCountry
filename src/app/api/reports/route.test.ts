import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    analyticsEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 4 }),
  getRateLimitKey: vi.fn().mockReturnValue("127.0.0.1"),
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { POST, GET } from "./route";

const session = { user: { id: "user-1" } };

beforeEach(() => vi.clearAllMocks());

describe("POST /api/reports", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ entityType: "event_review", entityId: "r1", reason: "spam" }),
    }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid entity type", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    const res = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ entityType: "invalid", entityId: "r1", reason: "spam" }),
    }));
    expect(res.status).toBe(400);
  });

  it("creates a report successfully", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    vi.mocked(prisma.analyticsEvent.create).mockResolvedValue({} as never);

    const res = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ entityType: "event_review", entityId: "r1", reason: "spam" }),
    }));
    const data = await res.json();
    expect(data.reported).toBe(true);
  });
});

describe("GET /api/reports", () => {
  it("returns 403 for non-admin", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: "user" } as never);

    const res = await GET(new Request("http://localhost/api/reports"));
    expect(res.status).toBe(403);
  });

  it("returns reports for admin", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: "admin" } as never);
    vi.mocked(prisma.analyticsEvent.findMany).mockResolvedValue([]);

    const res = await GET(new Request("http://localhost/api/reports"));
    const data = await res.json();
    expect(data.reports).toEqual([]);
  });
});
