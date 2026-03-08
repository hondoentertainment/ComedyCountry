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
    comedian: { findUnique: vi.fn() },
    comedianClaim: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

function createRequest(body: unknown) {
  return new NextRequest("http://localhost/api/comedian-claim", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/comedian-claim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await POST(createRequest({ comedianId: "c1" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when comedianId missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    const res = await POST(createRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 404 when comedian does not exist", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(prisma.comedian.findUnique).mockResolvedValue(null);
    const res = await POST(createRequest({ comedianId: "c1" }));
    expect(res.status).toBe(404);
  });

  it("returns 409 when user already has a claim", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(prisma.comedian.findUnique).mockResolvedValue({ id: "c1", name: "Test" } as never);
    vi.mocked(prisma.comedianClaim.findUnique).mockResolvedValue({ id: "claim1", status: "PENDING" } as never);
    const res = await POST(createRequest({ comedianId: "c1" }));
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain("already have a claim");
  });

  it("returns 409 when comedian already claimed by another user", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(prisma.comedian.findUnique).mockResolvedValue({ id: "c1", name: "Test" } as never);
    vi.mocked(prisma.comedianClaim.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.comedianClaim.findFirst).mockResolvedValue({ id: "claim2", status: "APPROVED" } as never);
    const res = await POST(createRequest({ comedianId: "c1" }));
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain("already been claimed");
  });

  it("creates claim successfully", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(prisma.comedian.findUnique).mockResolvedValue({ id: "c1", name: "Test" } as never);
    vi.mocked(prisma.comedianClaim.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.comedianClaim.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.comedianClaim.create).mockResolvedValue({
      id: "claim3", userId: "u1", comedianId: "c1", status: "PENDING",
    } as never);

    const res = await POST(createRequest({ comedianId: "c1", proofUrl: "https://ig.com/me" }));
    expect(res.status).toBe(201);
    expect(prisma.comedianClaim.create).toHaveBeenCalledWith({
      data: { userId: "u1", comedianId: "c1", proofUrl: "https://ig.com/me", proofNote: null },
    });
  });
});

describe("GET /api/comedian-claim", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns user claims", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(prisma.comedianClaim.findMany).mockResolvedValue([
      { id: "claim1", status: "PENDING" },
    ] as never);
    const res = await GET();
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].status).toBe("PENDING");
  });
});
