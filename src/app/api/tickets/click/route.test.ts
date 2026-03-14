import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "./route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticketClick: {
      create: vi.fn(),
      count: vi.fn(),
    },
    affiliatePartner: {
      findMany: vi.fn(),
    },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

function createPostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/tickets/click", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/tickets/click", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.ticketClick.create).mockResolvedValue({} as never);
    vi.mocked(prisma.affiliatePartner.findMany).mockResolvedValue([]);
  });

  it("returns 400 when eventId missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await POST(createPostRequest({ ticketUrl: "https://tickets.com" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when ticketUrl missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await POST(createPostRequest({ eventId: "e1" }));
    expect(res.status).toBe(400);
  });

  it("tracks click and returns original URL when no partners", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const url = "https://tickets.com/show123";
    const res = await POST(createPostRequest({ eventId: "e1", ticketUrl: url }));
    const data = await res.json();
    expect(data.url).toBe(url);
    expect(prisma.ticketClick.create).toHaveBeenCalled();
  });

  it("appends affiliate tag when partner matches", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(prisma.affiliatePartner.findMany).mockResolvedValue([
      { id: "p1", baseUrl: "ticketmaster.com", affiliateTag: "punchline-123", isActive: true },
    ] as never);

    const res = await POST(createPostRequest({
      eventId: "e1",
      ticketUrl: "https://ticketmaster.com/event/abc",
      referrer: "/events/e1",
    }));
    const data = await res.json();
    expect(data.url).toContain("ref=punchline-123");
  });

  it("tracks with user ID when authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    await POST(createPostRequest({ eventId: "e1", ticketUrl: "https://tickets.com" }));
    expect(prisma.ticketClick.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "u1" }),
    });
  });
});

describe("GET /api/tickets/click", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/tickets/click?eventId=e1");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when eventId missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    const req = new NextRequest("http://localhost/api/tickets/click");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns click stats", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(prisma.ticketClick.count)
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(25);
    const req = new NextRequest("http://localhost/api/tickets/click?eventId=e1");
    const res = await GET(req);
    const data = await res.json();
    expect(data.totalClicks).toBe(100);
    expect(data.last30dClicks).toBe(25);
  });
});
