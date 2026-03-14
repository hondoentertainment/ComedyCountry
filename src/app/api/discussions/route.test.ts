import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/community", () => ({
  getDiscussions: vi.fn(),
  createThread: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getDiscussions, createThread } from "@/lib/community";

describe("/api/discussions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com", name: "Test" },
      expires: "",
    });
  });

  describe("GET", () => {
    it("returns 400 when entityType or entityId missing", async () => {
      const req = new Request("http://test/api/discussions");
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("required");
    });

    it("returns discussions for entity", async () => {
      const mockDiscussions = {
        threads: [{ id: "t1", title: "Great show!", body: "Loved it" }],
        total: 1,
      };
      vi.mocked(getDiscussions).mockResolvedValue(mockDiscussions);

      const req = new Request(
        "http://test/api/discussions?entityType=comedian&entityId=c-1"
      );
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.threads).toHaveLength(1);
      expect(vi.mocked(getDiscussions)).toHaveBeenCalledWith(
        "comedian",
        "c-1",
        1
      );
    });

    it("passes page parameter", async () => {
      vi.mocked(getDiscussions).mockResolvedValue({ threads: [], total: 0 });

      const req = new Request(
        "http://test/api/discussions?entityType=venue&entityId=v-1&page=3"
      );
      await GET(req);

      expect(vi.mocked(getDiscussions)).toHaveBeenCalledWith("venue", "v-1", 3);
    });

    it("returns 500 on error", async () => {
      vi.mocked(getDiscussions).mockRejectedValue(new Error("DB error"));

      const req = new Request(
        "http://test/api/discussions?entityType=comedian&entityId=c-1"
      );
      const res = await GET(req);

      expect(res.status).toBe(500);
    });
  });

  describe("POST", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = new Request("http://test/api/discussions", {
        method: "POST",
        body: JSON.stringify({
          entityType: "comedian",
          entityId: "c-1",
          title: "Test",
          body: "Body",
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it("returns 400 when required fields missing", async () => {
      const req = new Request("http://test/api/discussions", {
        method: "POST",
        body: JSON.stringify({ entityType: "comedian" }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("required");
    });

    it("returns 400 for empty title or body", async () => {
      const req = new Request("http://test/api/discussions", {
        method: "POST",
        body: JSON.stringify({
          entityType: "comedian",
          entityId: "c-1",
          title: "  ",
          body: "Content",
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("creates thread and returns 201", async () => {
      const mockThread = {
        id: "t1",
        title: "Great show!",
        body: "Really enjoyed it",
      };
      vi.mocked(createThread).mockResolvedValue(mockThread);

      const req = new Request("http://test/api/discussions", {
        method: "POST",
        body: JSON.stringify({
          entityType: "comedian",
          entityId: "c-1",
          title: "Great show!",
          body: "Really enjoyed it",
        }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.title).toBe("Great show!");
      expect(vi.mocked(createThread)).toHaveBeenCalledWith(
        "user-1",
        "comedian",
        "c-1",
        "Great show!",
        "Really enjoyed it"
      );
    });

    it("returns 400 for invalid JSON", async () => {
      const req = new Request("http://test/api/discussions", {
        method: "POST",
        body: "not json",
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });
  });
});
