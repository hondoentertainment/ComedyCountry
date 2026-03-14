import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    pushSubscription: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { POST, DELETE } from "./route";

const session = { user: { id: "user-1" } };

beforeEach(() => vi.clearAllMocks());

describe("POST /api/push/subscribe", () => {
  it("returns 401 without auth", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ endpoint: "x", keys: { p256dh: "a", auth: "b" } }),
    }));
    expect(res.status).toBe(401);
  });

  it("returns 400 with invalid data", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    const res = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ endpoint: "" }),
    }));
    expect(res.status).toBe(400);
  });

  it("creates subscription", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    vi.mocked(prisma.pushSubscription.upsert).mockResolvedValue({ id: "sub-1" } as never);
    const res = await POST(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ endpoint: "https://push.example.com", keys: { p256dh: "key1", auth: "key2" } }),
    }));
    const data = await res.json();
    expect(data.subscribed).toBe(true);
  });
});

describe("DELETE /api/push/subscribe", () => {
  it("unsubscribes", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session);
    vi.mocked(prisma.pushSubscription.deleteMany).mockResolvedValue({ count: 1 } as never);
    const res = await DELETE(new Request("http://localhost", {
      method: "DELETE",
      body: JSON.stringify({ endpoint: "https://push.example.com" }),
    }));
    const data = await res.json();
    expect(data.unsubscribed).toBe(true);
  });
});
