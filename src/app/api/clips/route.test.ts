import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

vi.mock("@/lib/short-clips", () => ({
  getClipFeed: vi.fn(),
  createClip: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { getClipFeed, createClip } from "@/lib/short-clips";
import { getServerSession } from "next-auth";

function createRequest(url: string, options?: RequestInit) {
  return new NextRequest(url, options as any);
}

describe("GET /api/clips", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns clip feed with defaults", async () => {
    const feedData = { clips: [{ id: "c1" }], total: 1, page: 1, pageSize: 20 };
    vi.mocked(getClipFeed).mockResolvedValue(feedData as any);

    const req = createRequest("http://localhost/api/clips");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.clips).toHaveLength(1);
    expect(getClipFeed).toHaveBeenCalledWith({
      tags: undefined,
      page: 1,
      pageSize: 20,
      sort: "engagement",
    });
  });

  it("passes tags filter", async () => {
    vi.mocked(getClipFeed).mockResolvedValue({ clips: [], total: 0, page: 1, pageSize: 20 } as any);

    const req = createRequest("http://localhost/api/clips?tags=standup,improv");
    await GET(req);

    expect(getClipFeed).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ["standup", "improv"],
      })
    );
  });

  it("passes sort parameter", async () => {
    vi.mocked(getClipFeed).mockResolvedValue({ clips: [], total: 0, page: 1, pageSize: 20 } as any);

    const req = createRequest("http://localhost/api/clips?sort=recent");
    await GET(req);

    expect(getClipFeed).toHaveBeenCalledWith(
      expect.objectContaining({ sort: "recent" })
    );
  });

  it("passes pagination parameters", async () => {
    vi.mocked(getClipFeed).mockResolvedValue({ clips: [], total: 0, page: 2, pageSize: 10 } as any);

    const req = createRequest("http://localhost/api/clips?page=2&pageSize=10");
    await GET(req);

    expect(getClipFeed).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, pageSize: 10 })
    );
  });

  it("returns 500 on error", async () => {
    vi.mocked(getClipFeed).mockRejectedValue(new Error("DB error"));

    const req = createRequest("http://localhost/api/clips");
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});

describe("POST /api/clips", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = createRequest("http://localhost/api/clips", {
      method: "POST",
      body: JSON.stringify({
        videoUrl: "https://cdn.example.com/v.mp4",
        duration: 30,
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("creates clip with valid data", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    const clip = { id: "c1", videoUrl: "https://cdn.example.com/v.mp4", duration: 30 };
    vi.mocked(createClip).mockResolvedValue(clip as never);

    const req = createRequest("http://localhost/api/clips", {
      method: "POST",
      body: JSON.stringify({
        videoUrl: "https://cdn.example.com/v.mp4",
        duration: 30,
        tags: ["standup"],
      }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.id).toBe("c1");
    expect(createClip).toHaveBeenCalledWith(
      expect.objectContaining({
        videoUrl: "https://cdn.example.com/v.mp4",
        duration: 30,
        userId: "u1",
      })
    );
  });

  it("returns 400 when videoUrl is missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });

    const req = createRequest("http://localhost/api/clips", {
      method: "POST",
      body: JSON.stringify({ duration: 30 }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 when duration is missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });

    const req = createRequest("http://localhost/api/clips", {
      method: "POST",
      body: JSON.stringify({ videoUrl: "https://cdn.example.com/v.mp4" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 when duration exceeds 90 seconds", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(createClip).mockRejectedValue(new Error("Clip duration cannot exceed 90 seconds"));

    const req = createRequest("http://localhost/api/clips", {
      method: "POST",
      body: JSON.stringify({
        videoUrl: "https://cdn.example.com/v.mp4",
        duration: 100,
      }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("duration");
  });

  it("returns 400 for invalid JSON", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });

    const req = createRequest("http://localhost/api/clips", {
      method: "POST",
      body: "not json",
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 500 on internal error", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
    vi.mocked(createClip).mockRejectedValue(new Error("DB error"));

    const req = createRequest("http://localhost/api/clips", {
      method: "POST",
      body: JSON.stringify({
        videoUrl: "https://cdn.example.com/v.mp4",
        duration: 30,
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(500);
  });

  it("caps pageSize to 50", async () => {
    vi.mocked(getClipFeed).mockResolvedValue({ clips: [], total: 0, page: 1, pageSize: 50 } as any);

    const req = createRequest("http://localhost/api/clips?pageSize=100");
    await GET(req);

    expect(getClipFeed).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: 50 })
    );
  });

  it("enforces minimum page of 1", async () => {
    vi.mocked(getClipFeed).mockResolvedValue({ clips: [], total: 0, page: 1, pageSize: 20 } as any);

    const req = createRequest("http://localhost/api/clips?page=0");
    await GET(req);

    expect(getClipFeed).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 })
    );
  });
});
