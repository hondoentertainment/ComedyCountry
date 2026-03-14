import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    analyticsEvent: { create: vi.fn() },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

function createRequest(body: unknown) {
  return new NextRequest("http://localhost/api/analytics/track", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/analytics/track", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.analyticsEvent.create).mockResolvedValue({} as never);
  });

  it("returns 400 when entityType missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await POST(createRequest({ action: "view" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when action missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await POST(createRequest({ entityType: "comedian" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid action", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await POST(createRequest({ entityType: "comedian", action: "delete" }));
    expect(res.status).toBe(400);
  });

  it("tracks event for anonymous user", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await POST(createRequest({
      entityType: "comedian",
      entityId: "c1",
      action: "view",
    }));
    const data = await res.json();
    expect(data.tracked).toBe(true);
    expect(prisma.analyticsEvent.create).toHaveBeenCalledWith({
      data: {
        entityType: "comedian",
        entityId: "c1",
        action: "view",
        userId: null,
        metadata: null,
      },
    });
  });

  it("tracks event for authenticated user with metadata", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    const res = await POST(createRequest({
      entityType: "event",
      entityId: "e1",
      action: "ticket_click",
      metadata: { source: "event_page" },
    }));
    const data = await res.json();
    expect(data.tracked).toBe(true);
    expect(prisma.analyticsEvent.create).toHaveBeenCalledWith({
      data: {
        entityType: "event",
        entityId: "e1",
        action: "ticket_click",
        userId: "u1",
        metadata: JSON.stringify({ source: "event_page" }),
      },
    });
  });
});
