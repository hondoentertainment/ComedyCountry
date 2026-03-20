import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    eventWaitlist: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    event: { findUnique: vi.fn() },
    notification: { create: vi.fn() },
    user: { findUnique: vi.fn() },
    notificationPreference: { findUnique: vi.fn() },
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  waitlistConfirmationHtml: vi.fn().mockReturnValue("<html>waitlist</html>"),
}));

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/events/[id]/waitlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/events/e1/waitlist", {
      method: "POST",
    });
    const res = await POST(req, makeParams("e1"));

    expect(res.status).toBe(401);
  });

  it("removes from waitlist if already on it (toggle off)", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(prisma.eventWaitlist.findUnique).mockResolvedValue({
      id: "w1",
      userId: "u1",
      eventId: "e1",
    } as any);
    vi.mocked(prisma.eventWaitlist.delete).mockResolvedValue({} as any);

    const req = new NextRequest("http://localhost/api/events/e1/waitlist", {
      method: "POST",
    });
    const res = await POST(req, makeParams("e1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.onWaitlist).toBe(false);
    expect(prisma.eventWaitlist.delete).toHaveBeenCalledWith({
      where: { id: "w1" },
    });
  });

  it("adds to waitlist and creates notification", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(prisma.eventWaitlist.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.eventWaitlist.create).mockResolvedValue({} as any);
    vi.mocked(prisma.event.findUnique).mockResolvedValue({
      title: "Comedy Night",
      venue: { name: "Laugh Factory" },
      comedians: [],
    } as any);
    vi.mocked(prisma.notification.create).mockResolvedValue({} as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      email: "user@test.com",
      name: "Test User",
    } as any);
    vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue({
      emailDigest: "daily",
    } as any);

    const req = new NextRequest("http://localhost/api/events/e1/waitlist", {
      method: "POST",
    });
    const res = await POST(req, makeParams("e1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.onWaitlist).toBe(true);
    expect(prisma.eventWaitlist.create).toHaveBeenCalled();
    expect(prisma.notification.create).toHaveBeenCalled();
  });

  it("returns 503 on error", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(prisma.eventWaitlist.findUnique).mockRejectedValue(new Error("DB error"));

    const req = new NextRequest("http://localhost/api/events/e1/waitlist", {
      method: "POST",
    });
    const res = await POST(req, makeParams("e1"));

    expect(res.status).toBe(503);
  });
});

describe("GET /api/events/[id]/waitlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns count and onWaitlist false when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(prisma.eventWaitlist.count).mockResolvedValue(5);

    const req = new NextRequest("http://localhost/api/events/e1/waitlist");
    const res = await GET(req, makeParams("e1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.count).toBe(5);
    expect(data.onWaitlist).toBe(false);
  });

  it("returns count and onWaitlist true when user is on waitlist", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(prisma.eventWaitlist.count).mockResolvedValue(3);
    vi.mocked(prisma.eventWaitlist.findUnique).mockResolvedValue({
      id: "w1",
    } as any);

    const req = new NextRequest("http://localhost/api/events/e1/waitlist");
    const res = await GET(req, makeParams("e1"));
    const data = await res.json();

    expect(data.count).toBe(3);
    expect(data.onWaitlist).toBe(true);
  });

  it("returns defaults on error", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(prisma.eventWaitlist.count).mockRejectedValue(new Error("DB error"));

    const req = new NextRequest("http://localhost/api/events/e1/waitlist");
    const res = await GET(req, makeParams("e1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.count).toBe(0);
    expect(data.onWaitlist).toBe(false);
  });
});
