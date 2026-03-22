import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock all dependencies before importing routes
vi.mock("@/lib/accessibility", () => ({
  addAccessibilityTag: vi.fn(),
  getAccessibilityTags: vi.fn(),
  removeAccessibilityTag: vi.fn(),
  verifyAccessibilityTag: vi.fn(),
  searchAccessibleEvents: vi.fn(),
  searchAccessibleVenues: vi.fn(),
  getAccessibilityStats: vi.fn(),
  ACCESSIBILITY_TYPES: [
    "asl_interpreted",
    "captioned",
    "audio_described",
    "sensory_friendly",
    "wheelchair",
    "hearing_loop",
    "large_print",
    "service_animal",
  ],
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 59 }),
  getRateLimitKey: vi.fn().mockReturnValue("127.0.0.1"),
}));

import {
  addAccessibilityTag,
  getAccessibilityTags,
  removeAccessibilityTag,
  verifyAccessibilityTag,
  searchAccessibleEvents,
  searchAccessibleVenues,
  getAccessibilityStats,
} from "@/lib/accessibility";
import { getServerSession } from "next-auth";

// Import route handlers
import { GET as getTags, POST as postTag } from "./tags/route";
import { DELETE as deleteTag, PATCH as patchTag } from "./tags/[id]/route";
import { GET as getEvents } from "./events/route";
import { GET as getVenues } from "./venues/route";
import { GET as getStats } from "./stats/route";

function createRequest(url: string, options?: RequestInit) {
  return new NextRequest(url, options as any);
}

describe("Accessibility API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ─── GET /api/accessibility/tags ──────────────────────────────────── */

  describe("GET /api/accessibility/tags", () => {
    it("returns tags without filters", async () => {
      vi.mocked(getAccessibilityTags).mockResolvedValue([
        { id: "t1", type: "wheelchair", eventId: "e1" },
      ] as any);

      const req = createRequest("http://localhost/api/accessibility/tags");
      const res = await getTags(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.tags).toHaveLength(1);
      expect(getAccessibilityTags).toHaveBeenCalledWith(undefined, undefined);
    });

    it("passes eventId filter", async () => {
      vi.mocked(getAccessibilityTags).mockResolvedValue([]);

      const req = createRequest("http://localhost/api/accessibility/tags?eventId=e1");
      await getTags(req);

      expect(getAccessibilityTags).toHaveBeenCalledWith("e1", undefined);
    });

    it("passes venueId filter", async () => {
      vi.mocked(getAccessibilityTags).mockResolvedValue([]);

      const req = createRequest("http://localhost/api/accessibility/tags?venueId=v1");
      await getTags(req);

      expect(getAccessibilityTags).toHaveBeenCalledWith(undefined, "v1");
    });
  });

  /* ─── POST /api/accessibility/tags ─────────────────────────────────── */

  describe("POST /api/accessibility/tags", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = createRequest("http://localhost/api/accessibility/tags", {
        method: "POST",
        body: JSON.stringify({ eventId: "e1", type: "wheelchair" }),
      });
      const res = await postTag(req);

      expect(res.status).toBe(401);
    });

    it("creates a tag when authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
      vi.mocked(addAccessibilityTag).mockResolvedValue({
        id: "t1",
        eventId: "e1",
        type: "wheelchair",
      } as any);

      const req = createRequest("http://localhost/api/accessibility/tags", {
        method: "POST",
        body: JSON.stringify({ eventId: "e1", type: "wheelchair" }),
      });
      const res = await postTag(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.type).toBe("wheelchair");
    });

    it("returns 400 when type is missing", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });

      const req = createRequest("http://localhost/api/accessibility/tags", {
        method: "POST",
        body: JSON.stringify({ eventId: "e1" }),
      });
      const res = await postTag(req);

      expect(res.status).toBe(400);
    });

    it("returns 400 when neither eventId nor venueId provided", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });

      const req = createRequest("http://localhost/api/accessibility/tags", {
        method: "POST",
        body: JSON.stringify({ type: "wheelchair" }),
      });
      const res = await postTag(req);

      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid accessibility type", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
      vi.mocked(addAccessibilityTag).mockRejectedValue(
        new Error("Invalid accessibility type: bogus"),
      );

      const req = createRequest("http://localhost/api/accessibility/tags", {
        method: "POST",
        body: JSON.stringify({ eventId: "e1", type: "bogus" }),
      });
      const res = await postTag(req);

      expect(res.status).toBe(400);
    });
  });

  /* ─── DELETE /api/accessibility/tags/[id] ──────────────────────────── */

  describe("DELETE /api/accessibility/tags/[id]", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = createRequest("http://localhost/api/accessibility/tags/t1", {
        method: "DELETE",
      });
      const res = await deleteTag(req, { params: Promise.resolve({ id: "t1" }) });

      expect(res.status).toBe(401);
    });

    it("deletes tag when authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
      vi.mocked(removeAccessibilityTag).mockResolvedValue({
        id: "t1",
        type: "wheelchair",
      } as any);

      const req = createRequest("http://localhost/api/accessibility/tags/t1", {
        method: "DELETE",
      });
      const res = await deleteTag(req, { params: Promise.resolve({ id: "t1" }) });

      expect(res.status).toBe(200);
    });

    it("returns 404 when tag not found", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
      vi.mocked(removeAccessibilityTag).mockRejectedValue(
        new Error("Accessibility tag not found"),
      );

      const req = createRequest("http://localhost/api/accessibility/tags/nope", {
        method: "DELETE",
      });
      const res = await deleteTag(req, { params: Promise.resolve({ id: "nope" }) });

      expect(res.status).toBe(404);
    });
  });

  /* ─── PATCH /api/accessibility/tags/[id] (verify) ─────────────────── */

  describe("PATCH /api/accessibility/tags/[id]", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = createRequest("http://localhost/api/accessibility/tags/t1", {
        method: "PATCH",
      });
      const res = await patchTag(req, { params: Promise.resolve({ id: "t1" }) });

      expect(res.status).toBe(401);
    });

    it("verifies tag when authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
      vi.mocked(verifyAccessibilityTag).mockResolvedValue({
        id: "t1",
        verifiedBy: "u1",
        verifiedAt: new Date(),
      } as any);

      const req = createRequest("http://localhost/api/accessibility/tags/t1", {
        method: "PATCH",
      });
      const res = await patchTag(req, { params: Promise.resolve({ id: "t1" }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.verifiedBy).toBe("u1");
    });

    it("returns 404 when tag not found for verification", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } });
      vi.mocked(verifyAccessibilityTag).mockRejectedValue(
        new Error("Accessibility tag not found"),
      );

      const req = createRequest("http://localhost/api/accessibility/tags/nope", {
        method: "PATCH",
      });
      const res = await patchTag(req, { params: Promise.resolve({ id: "nope" }) });

      expect(res.status).toBe(404);
    });
  });

  /* ─── GET /api/accessibility/events ────────────────────────────────── */

  describe("GET /api/accessibility/events", () => {
    it("searches accessible events without filters", async () => {
      vi.mocked(searchAccessibleEvents).mockResolvedValue({
        events: [{ id: "e1" }] as any,
        total: 1,
      });

      const req = createRequest("http://localhost/api/accessibility/events");
      const res = await getEvents(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.events).toHaveLength(1);
      expect(data.total).toBe(1);
    });

    it("passes type and location filters", async () => {
      vi.mocked(searchAccessibleEvents).mockResolvedValue({
        events: [],
        total: 0,
      });

      const req = createRequest(
        "http://localhost/api/accessibility/events?types=wheelchair,captioned&city=Chicago&state=IL",
      );
      await getEvents(req);

      expect(searchAccessibleEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          types: ["wheelchair", "captioned"],
          city: "Chicago",
          state: "IL",
        }),
      );
    });
  });

  /* ─── GET /api/accessibility/venues ────────────────────────────────── */

  describe("GET /api/accessibility/venues", () => {
    it("searches accessible venues", async () => {
      vi.mocked(searchAccessibleVenues).mockResolvedValue({
        venues: [{ id: "v1" }] as any,
        total: 1,
      });

      const req = createRequest("http://localhost/api/accessibility/venues?types=wheelchair");
      const res = await getVenues(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.venues).toHaveLength(1);
    });
  });

  /* ─── GET /api/accessibility/stats ─────────────────────────────────── */

  describe("GET /api/accessibility/stats", () => {
    it("returns accessibility stats", async () => {
      vi.mocked(getAccessibilityStats).mockResolvedValue({
        totalTags: 10,
        eventsWithAccessibility: 5,
        venuesWithAccessibility: 3,
        eventPercentage: 50,
        venuePercentage: 30,
        verifiedTags: 7,
        byType: {} as any,
      });

      const res = await getStats(new Request("http://localhost"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.totalTags).toBe(10);
      expect(data.eventPercentage).toBe(50);
    });
  });
});
