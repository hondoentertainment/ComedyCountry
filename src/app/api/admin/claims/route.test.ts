import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "./route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    comedianClaim: { findUnique: vi.fn(), update: vi.fn() },
    comedian: { findUnique: vi.fn() },
    notification: { create: vi.fn() },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

function createRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/claims", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("PATCH /api/admin/claims", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await PATCH(createRequest({ claimId: "c1", action: "approve" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: "user" } as never);
    const res = await PATCH(createRequest({ claimId: "c1", action: "approve" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid action", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: "admin" } as never);
    const res = await PATCH(createRequest({ claimId: "c1", action: "destroy" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when claim not found", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: "admin" } as never);
    vi.mocked(prisma.comedianClaim.findUnique).mockResolvedValue(null);
    const res = await PATCH(createRequest({ claimId: "c1", action: "approve" }));
    expect(res.status).toBe(404);
  });

  it("returns 409 when claim already resolved", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: "admin" } as never);
    vi.mocked(prisma.comedianClaim.findUnique).mockResolvedValue({ id: "c1", status: "APPROVED" } as never);
    const res = await PATCH(createRequest({ claimId: "c1", action: "approve" }));
    expect(res.status).toBe(409);
  });

  it("approves claim and creates notification", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "admin1" } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: "admin" } as never);
    vi.mocked(prisma.comedianClaim.findUnique).mockResolvedValue({
      id: "c1", status: "PENDING", userId: "u2", comedianId: "com1",
    } as never);
    vi.mocked(prisma.comedianClaim.update).mockResolvedValue({ id: "c1", status: "APPROVED" } as never);
    vi.mocked(prisma.comedian.findUnique).mockResolvedValue({ name: "Dave" } as never);
    vi.mocked(prisma.notification.create).mockResolvedValue({} as never);

    const res = await PATCH(createRequest({ claimId: "c1", action: "approve" }));
    expect(res.status).toBe(200);
    expect(prisma.comedianClaim.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: expect.objectContaining({ status: "APPROVED", reviewedBy: "admin1" }),
    });
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "u2",
        type: "claim_approved",
      }),
    });
  });

  it("rejects claim without notification", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "admin1" } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ role: "admin" } as never);
    vi.mocked(prisma.comedianClaim.findUnique).mockResolvedValue({
      id: "c1", status: "PENDING", userId: "u2", comedianId: "com1",
    } as never);
    vi.mocked(prisma.comedianClaim.update).mockResolvedValue({ id: "c1", status: "REJECTED" } as never);

    const res = await PATCH(createRequest({ claimId: "c1", action: "reject" }));
    expect(res.status).toBe(200);
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });
});
