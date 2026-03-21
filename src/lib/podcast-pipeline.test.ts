import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  registerPodcast,
  getPodcastsForComedian,
  syncPodcastEpisodes,
  getRecentEpisodes,
  createPodcastTicketLink,
  recordPodcastClick,
  recordPodcastPurchase,
  getPodcastConversionStats,
  getTopConvertingEpisodes,
  setupLiveRecording,
  updateRecordingStatus,
  getLiveRecordingSessions,
  getListenerToAttendeeConversion,
  suggestPodcastTicketLinks,
} from "./podcast-pipeline";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    podcastShow: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    podcastEpisode: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    podcastTicketLink: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    liveRecordingSession: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    event: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  podcastShow: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  podcastEpisode: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  podcastTicketLink: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  liveRecordingSession: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  event: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("podcast-pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Registration & Listing ──────────────────────────────────────────

  describe("registerPodcast", () => {
    it("creates a podcast linked to a comedian", async () => {
      const podcast = {
        id: "pod1",
        comedianId: "c1",
        title: "Laugh Hour",
        feedUrl: "https://feed.example.com/rss",
        platform: "SPOTIFY",
        subscriberCount: 5000,
      };
      mockPrisma.podcastShow.create.mockResolvedValue(podcast);

      const result = await registerPodcast("c1", {
        title: "Laugh Hour",
        feedUrl: "https://feed.example.com/rss",
        platform: "SPOTIFY",
        subscriberCount: 5000,
      });

      expect(result).toEqual(podcast);
      expect(mockPrisma.podcastShow.create).toHaveBeenCalledWith({
        data: {
          comedianId: "c1",
          title: "Laugh Hour",
          feedUrl: "https://feed.example.com/rss",
          platform: "SPOTIFY",
          subscriberCount: 5000,
        },
      });
    });

    it("defaults subscriberCount to 0 if not provided", async () => {
      mockPrisma.podcastShow.create.mockResolvedValue({ id: "pod2" });

      await registerPodcast("c1", {
        title: "My Pod",
        feedUrl: "https://rss.example.com",
        platform: "RSS",
      });

      expect(mockPrisma.podcastShow.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ subscriberCount: 0 }),
      });
    });

    it("supports APPLE platform", async () => {
      mockPrisma.podcastShow.create.mockResolvedValue({ id: "pod3" });

      await registerPodcast("c1", {
        title: "Apple Pod",
        feedUrl: "https://apple.example.com",
        platform: "APPLE",
      });

      expect(mockPrisma.podcastShow.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ platform: "APPLE" }),
      });
    });
  });

  describe("getPodcastsForComedian", () => {
    it("returns podcasts with recent episodes", async () => {
      const podcasts = [
        { id: "pod1", title: "Show A", episodes: [] },
        { id: "pod2", title: "Show B", episodes: [{ id: "ep1" }] },
      ];
      mockPrisma.podcastShow.findMany.mockResolvedValue(podcasts);

      const result = await getPodcastsForComedian("c1");

      expect(result).toEqual(podcasts);
      expect(mockPrisma.podcastShow.findMany).toHaveBeenCalledWith({
        where: { comedianId: "c1" },
        orderBy: { createdAt: "desc" },
        include: { episodes: { take: 5, orderBy: { publishedAt: "desc" } } },
      });
    });

    it("returns empty array when comedian has no podcasts", async () => {
      mockPrisma.podcastShow.findMany.mockResolvedValue([]);

      const result = await getPodcastsForComedian("c-none");

      expect(result).toEqual([]);
    });
  });

  // ─── Episode Sync & Retrieval ────────────────────────────────────────

  describe("syncPodcastEpisodes", () => {
    it("syncs podcast episodes from RSS feed", async () => {
      mockPrisma.podcastShow.findUnique.mockResolvedValue({
        id: "pod1",
        title: "Test Show",
        feedUrl: "https://example.com/feed.xml",
      });
      mockPrisma.podcastEpisode.findMany.mockResolvedValue([]);
      mockPrisma.podcastEpisode.create.mockResolvedValue({ id: "ep1" });
      mockPrisma.podcastShow.update.mockResolvedValue({ id: "pod1" });

      // Mock global fetch for RSS
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("<rss><channel><title>Test</title></channel></rss>"),
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await syncPodcastEpisodes("pod1");

      expect(result.podcast).toBe("Test Show");
      expect(typeof result.newEpisodes).toBe("number");
      expect(typeof result.totalEpisodes).toBe("number");
      expect(Array.isArray(result.errors)).toBe(true);

      vi.unstubAllGlobals();
    });

    it("returns error when podcast not found", async () => {
      mockPrisma.podcastShow.findUnique.mockResolvedValue(null);

      await expect(syncPodcastEpisodes("bad-id")).rejects.toThrow();
    });
  });

  describe("getRecentEpisodes", () => {
    it("returns recent episodes across all comedian podcasts", async () => {
      mockPrisma.podcastShow.findMany.mockResolvedValue([
        { id: "pod1" },
        { id: "pod2" },
      ]);
      const episodes = [
        { id: "ep1", podcastId: "pod1", title: "Ep 1", ticketLinks: [] },
        { id: "ep2", podcastId: "pod2", title: "Ep 2", ticketLinks: [] },
      ];
      mockPrisma.podcastEpisode.findMany.mockResolvedValue(episodes);

      const result = await getRecentEpisodes("c1", 5);

      expect(result).toEqual(episodes);
      expect(mockPrisma.podcastEpisode.findMany).toHaveBeenCalledWith({
        where: { podcastId: { in: ["pod1", "pod2"] } },
        orderBy: { publishedAt: "desc" },
        take: 5,
        include: { ticketLinks: true },
      });
    });

    it("returns empty array when comedian has no podcasts", async () => {
      mockPrisma.podcastShow.findMany.mockResolvedValue([]);

      const result = await getRecentEpisodes("c-none");

      expect(result).toEqual([]);
      expect(mockPrisma.podcastEpisode.findMany).not.toHaveBeenCalled();
    });

    it("defaults limit to 10", async () => {
      mockPrisma.podcastShow.findMany.mockResolvedValue([{ id: "pod1" }]);
      mockPrisma.podcastEpisode.findMany.mockResolvedValue([]);

      await getRecentEpisodes("c1");

      expect(mockPrisma.podcastEpisode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });
  });

  // ─── Ticket Link Tracking ───────────────────────────────────────────

  describe("createPodcastTicketLink", () => {
    it("creates a trackable link between episode and event", async () => {
      const link = { id: "link1", episodeId: "ep1", eventId: "ev1", clipId: null };
      mockPrisma.podcastTicketLink.create.mockResolvedValue(link);

      const result = await createPodcastTicketLink("ep1", "ev1");

      expect(result).toEqual(link);
      expect(mockPrisma.podcastTicketLink.create).toHaveBeenCalledWith({
        data: { episodeId: "ep1", eventId: "ev1", clipId: null },
      });
    });

    it("creates link with optional clipId", async () => {
      const link = { id: "link2", episodeId: "ep1", eventId: "ev1", clipId: "clip1" };
      mockPrisma.podcastTicketLink.create.mockResolvedValue(link);

      const result = await createPodcastTicketLink("ep1", "ev1", "clip1");

      expect(result).toEqual(link);
      expect(mockPrisma.podcastTicketLink.create).toHaveBeenCalledWith({
        data: { episodeId: "ep1", eventId: "ev1", clipId: "clip1" },
      });
    });
  });

  describe("recordPodcastClick", () => {
    it("increments click count on a ticket link", async () => {
      const updated = { id: "link1", clicks: 1 };
      mockPrisma.podcastTicketLink.update.mockResolvedValue(updated);

      const result = await recordPodcastClick("link1");

      expect(result.clicks).toBe(1);
      expect(mockPrisma.podcastTicketLink.update).toHaveBeenCalledWith({
        where: { id: "link1" },
        data: { clicks: { increment: 1 } },
      });
    });
  });

  describe("recordPodcastPurchase", () => {
    it("increments purchase count and adds revenue", async () => {
      const updated = { id: "link1", purchases: 1, revenue: 25 };
      mockPrisma.podcastTicketLink.update.mockResolvedValue(updated);

      const result = await recordPodcastPurchase("link1", 25);

      expect(result.purchases).toBe(1);
      expect(result.revenue).toBe(25);
      expect(mockPrisma.podcastTicketLink.update).toHaveBeenCalledWith({
        where: { id: "link1" },
        data: {
          purchases: { increment: 1 },
          revenue: { increment: 25 },
        },
      });
    });

    it("handles zero-amount purchase", async () => {
      mockPrisma.podcastTicketLink.update.mockResolvedValue({
        id: "link1",
        purchases: 1,
        revenue: 0,
      });

      await recordPodcastPurchase("link1", 0);

      expect(mockPrisma.podcastTicketLink.update).toHaveBeenCalledWith({
        where: { id: "link1" },
        data: {
          purchases: { increment: 1 },
          revenue: { increment: 0 },
        },
      });
    });
  });

  // ─── Conversion Stats ───────────────────────────────────────────────

  describe("getPodcastConversionStats", () => {
    it("computes aggregate conversion stats", async () => {
      mockPrisma.podcastShow.findMany.mockResolvedValue([{ id: "pod1" }]);
      mockPrisma.podcastEpisode.findMany.mockResolvedValue([{ id: "ep1" }, { id: "ep2" }]);
      mockPrisma.podcastTicketLink.findMany.mockResolvedValue([
        { clicks: 100, purchases: 10, revenue: 250 },
        { clicks: 200, purchases: 30, revenue: 750 },
      ]);

      const result = await getPodcastConversionStats("c1");

      expect(result.totalClicks).toBe(300);
      expect(result.totalPurchases).toBe(40);
      expect(result.totalRevenue).toBe(1000);
      expect(result.conversionRate).toBeCloseTo(40 / 300);
    });

    it("returns zeros when comedian has no podcasts", async () => {
      mockPrisma.podcastShow.findMany.mockResolvedValue([]);

      const result = await getPodcastConversionStats("c-none");

      expect(result).toEqual({
        totalClicks: 0,
        totalPurchases: 0,
        totalRevenue: 0,
        conversionRate: 0,
      });
    });

    it("returns zeros when comedian has podcasts but no episodes", async () => {
      mockPrisma.podcastShow.findMany.mockResolvedValue([{ id: "pod1" }]);
      mockPrisma.podcastEpisode.findMany.mockResolvedValue([]);

      const result = await getPodcastConversionStats("c1");

      expect(result).toEqual({
        totalClicks: 0,
        totalPurchases: 0,
        totalRevenue: 0,
        conversionRate: 0,
      });
    });

    it("handles zero clicks (avoids division by zero)", async () => {
      mockPrisma.podcastShow.findMany.mockResolvedValue([{ id: "pod1" }]);
      mockPrisma.podcastEpisode.findMany.mockResolvedValue([{ id: "ep1" }]);
      mockPrisma.podcastTicketLink.findMany.mockResolvedValue([
        { clicks: 0, purchases: 0, revenue: 0 },
      ]);

      const result = await getPodcastConversionStats("c1");

      expect(result.conversionRate).toBe(0);
    });
  });

  // ─── Top Converting Episodes ────────────────────────────────────────

  describe("getTopConvertingEpisodes", () => {
    it("ranks episodes by total purchases", async () => {
      mockPrisma.podcastShow.findMany.mockResolvedValue([{ id: "pod1" }]);
      mockPrisma.podcastEpisode.findMany.mockResolvedValue([
        {
          id: "ep1",
          title: "Low Sales",
          ticketLinks: [{ purchases: 2, revenue: 50 }],
        },
        {
          id: "ep2",
          title: "High Sales",
          ticketLinks: [
            { purchases: 10, revenue: 250 },
            { purchases: 5, revenue: 125 },
          ],
        },
        {
          id: "ep3",
          title: "Mid Sales",
          ticketLinks: [{ purchases: 7, revenue: 175 }],
        },
      ]);

      const result = await getTopConvertingEpisodes("c1", 3);

      expect(result[0].id).toBe("ep2");
      expect(result[0].totalPurchases).toBe(15);
      expect(result[0].totalRevenue).toBe(375);
      expect(result[1].id).toBe("ep3");
      expect(result[2].id).toBe("ep1");
    });

    it("returns empty array when comedian has no podcasts", async () => {
      mockPrisma.podcastShow.findMany.mockResolvedValue([]);

      const result = await getTopConvertingEpisodes("c-none");

      expect(result).toEqual([]);
    });

    it("limits results to specified count", async () => {
      mockPrisma.podcastShow.findMany.mockResolvedValue([{ id: "pod1" }]);
      mockPrisma.podcastEpisode.findMany.mockResolvedValue([
        { id: "ep1", ticketLinks: [{ purchases: 10, revenue: 250 }] },
        { id: "ep2", ticketLinks: [{ purchases: 5, revenue: 125 }] },
        { id: "ep3", ticketLinks: [{ purchases: 1, revenue: 25 }] },
      ]);

      const result = await getTopConvertingEpisodes("c1", 2);

      expect(result).toHaveLength(2);
    });

    it("handles episodes with no ticket links", async () => {
      mockPrisma.podcastShow.findMany.mockResolvedValue([{ id: "pod1" }]);
      mockPrisma.podcastEpisode.findMany.mockResolvedValue([
        { id: "ep1", ticketLinks: [] },
      ]);

      const result = await getTopConvertingEpisodes("c1");

      expect(result[0].totalPurchases).toBe(0);
      expect(result[0].totalRevenue).toBe(0);
    });
  });

  // ─── Live Recording Session Lifecycle ───────────────────────────────

  describe("setupLiveRecording", () => {
    it("creates a PLANNED live recording session", async () => {
      const session = {
        id: "ses1",
        eventId: "ev1",
        podcastId: "pod1",
        status: "PLANNED",
        audioQuality: "STUDIO",
        consentRequired: true,
      };
      mockPrisma.liveRecordingSession.create.mockResolvedValue(session);

      const result = await setupLiveRecording("ev1", "pod1", {
        audioQuality: "STUDIO",
      });

      expect(result.status).toBe("PLANNED");
      expect(result.audioQuality).toBe("STUDIO");
    });

    it("defaults consent to required and quality to STANDARD", async () => {
      mockPrisma.liveRecordingSession.create.mockResolvedValue({ id: "ses2" });

      await setupLiveRecording("ev1", "pod1", {});

      expect(mockPrisma.liveRecordingSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          consentRequired: true,
          audioQuality: "STANDARD",
          distributionPlatforms: [],
          status: "PLANNED",
        }),
      });
    });
  });

  describe("updateRecordingStatus", () => {
    it("transitions from PLANNED to RECORDING", async () => {
      mockPrisma.liveRecordingSession.update.mockResolvedValue({
        id: "ses1",
        status: "RECORDING",
      });

      const result = await updateRecordingStatus("ses1", "RECORDING");

      expect(result.status).toBe("RECORDING");
    });

    it("transitions from RECORDING to POST_PRODUCTION", async () => {
      mockPrisma.liveRecordingSession.update.mockResolvedValue({
        id: "ses1",
        status: "POST_PRODUCTION",
      });

      const result = await updateRecordingStatus("ses1", "POST_PRODUCTION");

      expect(result.status).toBe("POST_PRODUCTION");
    });

    it("transitions from POST_PRODUCTION to PUBLISHED", async () => {
      mockPrisma.liveRecordingSession.update.mockResolvedValue({
        id: "ses1",
        status: "PUBLISHED",
      });

      const result = await updateRecordingStatus("ses1", "PUBLISHED");

      expect(result.status).toBe("PUBLISHED");
    });
  });

  describe("getLiveRecordingSessions", () => {
    it("returns all recording sessions for a comedian", async () => {
      mockPrisma.podcastShow.findMany.mockResolvedValue([{ id: "pod1" }]);
      const sessions = [
        { id: "ses1", status: "PLANNED" },
        { id: "ses2", status: "PUBLISHED" },
      ];
      mockPrisma.liveRecordingSession.findMany.mockResolvedValue(sessions);

      const result = await getLiveRecordingSessions("c1");

      expect(result).toEqual(sessions);
    });

    it("returns empty when comedian has no podcasts", async () => {
      mockPrisma.podcastShow.findMany.mockResolvedValue([]);

      const result = await getLiveRecordingSessions("c-none");

      expect(result).toEqual([]);
    });
  });

  // ─── Listener-to-Attendee Conversion ───────────────────────────────

  describe("getListenerToAttendeeConversion", () => {
    it("computes conversion rate from listeners to ticket purchasers", async () => {
      mockPrisma.podcastShow.findMany.mockResolvedValue([
        {
          id: "pod1",
          episodes: [
            { id: "ep1", listenerCount: 1000 },
            { id: "ep2", listenerCount: 2000 },
          ],
        },
      ]);
      mockPrisma.podcastTicketLink.findMany.mockResolvedValue([
        { purchases: 30 },
        { purchases: 20 },
      ]);

      const result = await getListenerToAttendeeConversion("c1");

      expect(result.totalListeners).toBe(3000);
      expect(result.totalAttendees).toBe(50);
      expect(result.conversionRate).toBeCloseTo(50 / 3000);
    });

    it("returns zeros when comedian has no podcasts", async () => {
      mockPrisma.podcastShow.findMany.mockResolvedValue([]);

      const result = await getListenerToAttendeeConversion("c-none");

      expect(result).toEqual({
        totalListeners: 0,
        totalAttendees: 0,
        conversionRate: 0,
      });
    });

    it("returns zeros when podcasts have no episodes", async () => {
      mockPrisma.podcastShow.findMany.mockResolvedValue([
        { id: "pod1", episodes: [] },
      ]);

      const result = await getListenerToAttendeeConversion("c1");

      expect(result).toEqual({
        totalListeners: 0,
        totalAttendees: 0,
        conversionRate: 0,
      });
    });

    it("handles zero listeners (avoids division by zero)", async () => {
      mockPrisma.podcastShow.findMany.mockResolvedValue([
        {
          id: "pod1",
          episodes: [{ id: "ep1", listenerCount: 0 }],
        },
      ]);
      mockPrisma.podcastTicketLink.findMany.mockResolvedValue([]);

      const result = await getListenerToAttendeeConversion("c1");

      expect(result.conversionRate).toBe(0);
    });
  });

  // ─── Event Suggestions ─────────────────────────────────────────────

  describe("suggestPodcastTicketLinks", () => {
    it("returns upcoming events paired with podcast info", async () => {
      const events = [
        { id: "ev1", title: "Show A", date: new Date("2026-04-01") },
      ];
      mockPrisma.event.findMany.mockResolvedValue(events);
      mockPrisma.podcastShow.findMany.mockResolvedValue([
        {
          id: "pod1",
          title: "My Pod",
          episodes: [{ id: "ep1", title: "Latest" }],
        },
      ]);

      const result = await suggestPodcastTicketLinks("c1");

      expect(result).toHaveLength(1);
      expect(result[0].event.id).toBe("ev1");
      expect(result[0].podcasts[0].latestEpisode.id).toBe("ep1");
    });

    it("returns empty when no upcoming events", async () => {
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.podcastShow.findMany.mockResolvedValue([]);

      const result = await suggestPodcastTicketLinks("c1");

      expect(result).toEqual([]);
    });

    it("handles podcast with no episodes", async () => {
      mockPrisma.event.findMany.mockResolvedValue([
        { id: "ev1", title: "Show", date: new Date() },
      ]);
      mockPrisma.podcastShow.findMany.mockResolvedValue([
        { id: "pod1", title: "Empty Pod", episodes: [] },
      ]);

      const result = await suggestPodcastTicketLinks("c1");

      expect(result[0].podcasts[0].latestEpisode).toBeNull();
    });
  });
});
