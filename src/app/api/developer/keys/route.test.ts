import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "./route";

vi.mock("@/lib/marketplace", () => ({
  createApiKey: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    apiKey: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { createApiKey } from "@/lib/marketplace";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

const mockPrisma = prisma as unknown as {
  apiKey: {
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

function createRequest(url: string, options?: RequestInit) {
  return new NextRequest(url, options);
}

describe("GET /api/developer/keys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = createRequest("http://localhost/api/developer/keys");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns API keys for authenticated user", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.apiKey.findMany.mockResolvedValue([
      { id: "ak1", name: "My Key", key: "pa_free_abc", tier: "free", rateLimit: 100, isActive: true },
    ]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.keys).toHaveLength(1);
    expect(data.keys[0].name).toBe("My Key");
  });
});

describe("POST /api/developer/keys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = createRequest("http://localhost/api/developer/keys", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when name missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });

    const req = createRequest("http://localhost/api/developer/keys", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("creates API key and returns 201", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(createApiKey).mockResolvedValue({
      id: "ak1",
      name: "My App",
      key: "pa_free_xyz",
    });

    const req = createRequest("http://localhost/api/developer/keys", {
      method: "POST",
      body: JSON.stringify({ name: "My App" }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.name).toBe("My App");
    expect(createApiKey).toHaveBeenCalledWith("u1", "My App");
  });
});

describe("DELETE /api/developer/keys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = createRequest("http://localhost/api/developer/keys?keyId=ak1", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when keyId missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });

    const req = createRequest("http://localhost/api/developer/keys", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("deactivates API key", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.apiKey.update.mockResolvedValue({ id: "ak1", isActive: false });

    const req = createRequest("http://localhost/api/developer/keys?keyId=ak1", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockPrisma.apiKey.update).toHaveBeenCalledWith({
      where: { id: "ak1", userId: "u1" },
      data: { isActive: false },
    });
  });
});
