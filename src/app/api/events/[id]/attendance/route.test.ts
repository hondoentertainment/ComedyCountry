import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    eventAttendance: {
      groupBy: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
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

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/events/[id]/attendance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns counts and null userStatus when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(prisma.eventAttendance.groupBy).mockResolvedValue([
      { status: "going", _count: 5 },
      { status: "interested", _count: 3 },
    ] as any);

    const req = new NextRequest("http://localhost/api/events/e1/attendance");
    const res = await GET(req, makeParams("e1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.going).toBe(5);
    expect(data.interested).toBe(3);
    expect(data.userStatus).toBeNull();
  });

  it("returns userStatus when authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(prisma.eventAttendance.groupBy).mockResolvedValue([
      { status: "going", _count: 2 },
    ] as any);
    vi.mocked(prisma.eventAttendance.findUnique).mockResolvedValue({
      status: "going",
    } as any);

    const req = new NextRequest("http://localhost/api/events/e1/attendance");
    const res = await GET(req, makeParams("e1"));
    const data = await res.json();

    expect(data.going).toBe(2);
    expect(data.interested).toBe(0);
    expect(data.userStatus).toBe("going");
  });
});

describe("POST /api/events/[id]/attendance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/events/e1/attendance", {
      method: "POST",
      body: JSON.stringify({ status: "going" }),
    });
    const res = await POST(req, makeParams("e1"));

    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid status", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });

    const req = new NextRequest("http://localhost/api/events/e1/attendance", {
      method: "POST",
      body: JSON.stringify({ status: "maybe" }),
    });
    const res = await POST(req, makeParams("e1"));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid status");
  });

  it("toggles off when same status already exists", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(prisma.eventAttendance.findUnique).mockResolvedValue({
      id: "a1",
      status: "going",
    } as any);
    vi.mocked(prisma.eventAttendance.delete).mockResolvedValue({} as any);

    const req = new NextRequest("http://localhost/api/events/e1/attendance", {
      method: "POST",
      body: JSON.stringify({ status: "going" }),
    });
    const res = await POST(req, makeParams("e1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.userStatus).toBeNull();
    expect(prisma.eventAttendance.delete).toHaveBeenCalledWith({
      where: { id: "a1" },
    });
  });

  it("upserts attendance with new status", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(prisma.eventAttendance.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.eventAttendance.upsert).mockResolvedValue({} as any);

    const req = new NextRequest("http://localhost/api/events/e1/attendance", {
      method: "POST",
      body: JSON.stringify({ status: "interested" }),
    });
    const res = await POST(req, makeParams("e1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.userStatus).toBe("interested");
    expect(prisma.eventAttendance.upsert).toHaveBeenCalled();
  });

  it("upserts when changing status from going to interested", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(prisma.eventAttendance.findUnique).mockResolvedValue({
      id: "a1",
      status: "going",
    } as any);
    vi.mocked(prisma.eventAttendance.upsert).mockResolvedValue({} as any);

    const req = new NextRequest("http://localhost/api/events/e1/attendance", {
      method: "POST",
      body: JSON.stringify({ status: "interested" }),
    });
    const res = await POST(req, makeParams("e1"));
    const data = await res.json();

    expect(data.userStatus).toBe("interested");
    expect(prisma.eventAttendance.upsert).toHaveBeenCalled();
    expect(prisma.eventAttendance.delete).not.toHaveBeenCalled();
  });
});
