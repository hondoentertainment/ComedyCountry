import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "./route";

vi.mock("@/lib/marketplace", () => ({
  getAgentRoster: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    agentRoster: {
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 59 }),
  getRateLimitKey: vi.fn().mockReturnValue("127.0.0.1"),
}));

import { getAgentRoster } from "@/lib/marketplace";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

const mockPrisma = prisma as unknown as {
  agentRoster: {
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

function createRequest(url: string, options?: RequestInit) {
  return new NextRequest(url, options as any);
}

describe("GET /api/agent-roster", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"));
    expect(res.status).toBe(401);
  });

  it("returns roster for authenticated user", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(getAgentRoster).mockResolvedValue([
      { id: "ar1", comedian: { name: "Dave" } } as any,
    ]);

    const res = await GET(new Request("http://localhost"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.roster).toHaveLength(1);
    expect(getAgentRoster).toHaveBeenCalledWith("u1");
  });
});

describe("POST /api/agent-roster", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = createRequest("http://localhost/api/agent-roster", {
      method: "POST",
      body: JSON.stringify({ comedianId: "c1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when comedianId missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });

    const req = createRequest("http://localhost/api/agent-roster", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("creates roster entry and returns 201", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.agentRoster.create.mockResolvedValue({
      id: "ar1",
      comedianId: "c1",
      comedian: { name: "Dave" },
    });

    const req = createRequest("http://localhost/api/agent-roster", {
      method: "POST",
      body: JSON.stringify({ comedianId: "c1", commission: 15 }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.comedianId).toBe("c1");
  });
});

describe("DELETE /api/agent-roster", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = createRequest("http://localhost/api/agent-roster?comedianId=c1", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when comedianId missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });

    const req = createRequest("http://localhost/api/agent-roster", { method: "DELETE" });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("deletes roster entry", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.agentRoster.delete.mockResolvedValue({});

    const req = createRequest("http://localhost/api/agent-roster?comedianId=c1", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockPrisma.agentRoster.delete).toHaveBeenCalledWith({
      where: { userId_comedianId: { userId: "u1", comedianId: "c1" } },
    });
  });
});
