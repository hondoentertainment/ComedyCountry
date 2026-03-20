import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

vi.mock("@/lib/creator", () => ({
  getComedianForUser: vi.fn(),
  getExclusiveContent: vi.fn(),
  createExclusiveContent: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { getComedianForUser, getExclusiveContent, createExclusiveContent } from "@/lib/creator";
import { getServerSession } from "next-auth";

function createRequest(url: string, options?: RequestInit) {
  return new NextRequest(url, options as any);
}

describe("GET /api/creator/content", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when comedianId missing", async () => {
    const req = createRequest("http://localhost/api/creator/content");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns exclusive content for comedian", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(getExclusiveContent).mockResolvedValue([
      { id: "ec1", title: "Post 1" } as any,
    ]);

    const req = createRequest("http://localhost/api/creator/content?comedianId=c1");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(getExclusiveContent).toHaveBeenCalledWith("c1", "u1", 20);
  });

  it("caps limit at 100", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(getExclusiveContent).mockResolvedValue([]);

    const req = createRequest("http://localhost/api/creator/content?comedianId=c1&limit=500");
    await GET(req);

    expect(getExclusiveContent).toHaveBeenCalledWith("c1", null, 100);
  });
});

describe("POST /api/creator/content", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = createRequest("http://localhost/api/creator/content", {
      method: "POST",
      body: JSON.stringify({ title: "Test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 when user has no comedian profile", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(getComedianForUser).mockResolvedValue(null);

    const req = createRequest("http://localhost/api/creator/content", {
      method: "POST",
      body: JSON.stringify({ title: "Test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 when title missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(getComedianForUser).mockResolvedValue({ id: "c1", name: "Dave" } as any);

    const req = createRequest("http://localhost/api/creator/content", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("creates content and returns 201", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(getComedianForUser).mockResolvedValue({ id: "c1", name: "Dave" } as any);
    vi.mocked(createExclusiveContent).mockResolvedValue({
      id: "ec1",
      title: "My Bit",
    } as any);

    const req = createRequest("http://localhost/api/creator/content", {
      method: "POST",
      body: JSON.stringify({ title: "My Bit", body: "About comedy", isGated: true }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.title).toBe("My Bit");
    expect(createExclusiveContent).toHaveBeenCalledWith("c1", {
      title: "My Bit",
      body: "About comedy",
      mediaUrl: undefined,
      mediaType: undefined,
      embedUrl: undefined,
      isGated: true,
    });
  });
});
