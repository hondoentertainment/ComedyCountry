import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

vi.mock("@/lib/webhooks", () => ({
  registerWebhook: vi.fn(),
  listWebhooks: vi.fn(),
  WEBHOOK_EVENTS: [
    "event.created",
    "event.updated",
    "event.cancelled",
    "ticket.sold",
    "ticket.refunded",
    "review.posted",
    "review.updated",
    "comedian.added",
    "venue.updated",
  ],
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    apiKey: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    webhookEndpoint: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { registerWebhook } from "@/lib/webhooks";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

const mockPrisma = prisma as unknown as {
  apiKey: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  webhookEndpoint: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

function createRequest(url: string, options?: RequestInit) {
  return new NextRequest(url, options);
}

describe("GET /api/developer/webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns webhooks for authenticated user", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.apiKey.findMany.mockResolvedValue([{ id: "ak1" }]);
    mockPrisma.webhookEndpoint.findMany.mockResolvedValue([
      {
        id: "wh1",
        apiKeyId: "ak1",
        url: "https://example.com/hook",
        events: ["event.created"],
        active: true,
      },
    ]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.webhooks).toHaveLength(1);
    expect(data.webhooks[0].url).toBe("https://example.com/hook");
  });

  it("returns empty array when user has no API keys", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.apiKey.findMany.mockResolvedValue([]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.webhooks).toEqual([]);
  });
});

describe("POST /api/developer/webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = createRequest("http://localhost/api/developer/webhooks", {
      method: "POST",
      body: JSON.stringify({
        url: "https://example.com/hook",
        events: ["event.created"],
        apiKeyId: "ak1",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("creates webhook with valid data", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.apiKey.findFirst.mockResolvedValue({
      id: "ak1",
      userId: "u1",
      isActive: true,
    });
    vi.mocked(registerWebhook).mockResolvedValue({
      id: "wh1",
      apiKeyId: "ak1",
      url: "https://example.com/hook",
      events: ["event.created"],
      secret: "generated-secret",
      active: true,
    });

    const req = createRequest("http://localhost/api/developer/webhooks", {
      method: "POST",
      body: JSON.stringify({
        url: "https://example.com/hook",
        events: ["event.created"],
        apiKeyId: "ak1",
      }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.url).toBe("https://example.com/hook");
    expect(registerWebhook).toHaveBeenCalledWith(
      "ak1",
      "https://example.com/hook",
      ["event.created"]
    );
  });

  it("returns 400 for invalid events", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });

    const req = createRequest("http://localhost/api/developer/webhooks", {
      method: "POST",
      body: JSON.stringify({
        url: "https://example.com/hook",
        events: ["invalid.event"],
        apiKeyId: "ak1",
      }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid events");
  });

  it("returns 400 for invalid URL", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });

    const req = createRequest("http://localhost/api/developer/webhooks", {
      method: "POST",
      body: JSON.stringify({
        url: "not-a-url",
        events: ["event.created"],
        apiKeyId: "ak1",
      }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("url");
  });

  it("returns 400 for empty events array", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });

    const req = createRequest("http://localhost/api/developer/webhooks", {
      method: "POST",
      body: JSON.stringify({
        url: "https://example.com/hook",
        events: [],
        apiKeyId: "ak1",
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 when apiKeyId is missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });

    const req = createRequest("http://localhost/api/developer/webhooks", {
      method: "POST",
      body: JSON.stringify({
        url: "https://example.com/hook",
        events: ["event.created"],
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 404 when API key not found", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.apiKey.findFirst.mockResolvedValue(null);

    const req = createRequest("http://localhost/api/developer/webhooks", {
      method: "POST",
      body: JSON.stringify({
        url: "https://example.com/hook",
        events: ["event.created"],
        apiKeyId: "nonexistent",
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(404);
  });
});
