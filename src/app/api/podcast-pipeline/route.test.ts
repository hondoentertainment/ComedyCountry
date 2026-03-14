import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/podcast-pipeline", () => ({
  registerPodcast: vi.fn(),
  getPodcastsForComedian: vi.fn(),
  getRecentEpisodes: vi.fn(),
  createPodcastTicketLink: vi.fn(),
  getPodcastConversionStats: vi.fn(),
  recordPodcastClick: vi.fn(),
  setupLiveRecording: vi.fn(),
  getLiveRecordingSessions: vi.fn(),
  updateRecordingStatus: vi.fn(),
  getListenerToAttendeeConversion: vi.fn(),
  suggestPodcastTicketLinks: vi.fn(),
}));

vi.mock("@/lib/creator", () => ({
  getComedianForUser: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { getServerSession } from "next-auth";
import { getComedianForUser } from "@/lib/creator";
import {
  registerPodcast,
  getPodcastsForComedian,
  getRecentEpisodes,
  createPodcastTicketLink,
  getPodcastConversionStats,
  recordPodcastClick,
  setupLiveRecording,
  getLiveRecordingSessions,
  updateRecordingStatus,
  getListenerToAttendeeConversion,
  suggestPodcastTicketLinks,
} from "@/lib/podcast-pipeline";

import { GET as getPodcasts, POST as postPodcast } from "./podcasts/route";
import { GET as getEpisodes } from "./episodes/route";
import { GET as getTicketLinkStats, POST as postTicketLink } from "./ticket-links/route";
import { POST as postClick } from "./ticket-links/click/route";
import { GET as getRecordings, POST as postRecording } from "./live-recording/route";
import { PATCH as patchRecording } from "./live-recording/[id]/route";
import { GET as getConversion } from "./conversion/route";
import { GET as getSuggestions } from "./suggestions/route";

const mockSession = vi.mocked(getServerSession);
const mockGetComedian = vi.mocked(getComedianForUser);

function makeRequest(url: string, options?: RequestInit) {
  return new Request(url, options);
}

describe("podcast-pipeline API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── GET /podcasts ─────────────────────────────────────────────────

  describe("GET /podcasts", () => {
    it("returns 400 when comedianId is missing", async () => {
      const req = makeRequest("http://localhost/api/podcast-pipeline/podcasts");
      const res = await getPodcasts(req);
      expect(res.status).toBe(400);
    });

    it("returns podcasts for a comedian", async () => {
      const podcasts = [{ id: "pod1", title: "My Pod" }];
      vi.mocked(getPodcastsForComedian).mockResolvedValue(podcasts as never);

      const req = makeRequest("http://localhost/api/podcast-pipeline/podcasts?comedianId=c1");
      const res = await getPodcasts(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual(podcasts);
    });
  });

  // ─── POST /podcasts ────────────────────────────────────────────────

  describe("POST /podcasts", () => {
    it("returns 401 when not authenticated", async () => {
      mockSession.mockResolvedValue(null);

      const req = makeRequest("http://localhost/api/podcast-pipeline/podcasts", {
        method: "POST",
        body: JSON.stringify({ title: "Pod", feedUrl: "https://rss.com", platform: "RSS" }),
      });
      const res = await postPodcast(req);
      expect(res.status).toBe(401);
    });

    it("returns 403 when user has no comedian profile", async () => {
      mockSession.mockResolvedValue({ user: { id: "u1" } } as never);
      mockGetComedian.mockResolvedValue(null);

      const req = makeRequest("http://localhost/api/podcast-pipeline/podcasts", {
        method: "POST",
        body: JSON.stringify({ title: "Pod", feedUrl: "https://rss.com", platform: "RSS" }),
      });
      const res = await postPodcast(req);
      expect(res.status).toBe(403);
    });

    it("creates a podcast when authenticated with comedian profile", async () => {
      mockSession.mockResolvedValue({ user: { id: "u1" } } as never);
      mockGetComedian.mockResolvedValue({ id: "c1", name: "Dave" } as never);
      vi.mocked(registerPodcast).mockResolvedValue({ id: "pod1" } as never);

      const req = makeRequest("http://localhost/api/podcast-pipeline/podcasts", {
        method: "POST",
        body: JSON.stringify({
          title: "Laugh Hour",
          feedUrl: "https://rss.com/feed",
          platform: "SPOTIFY",
        }),
      });
      const res = await postPodcast(req);
      expect(res.status).toBe(201);
    });
  });

  // ─── GET /episodes ─────────────────────────────────────────────────

  describe("GET /episodes", () => {
    it("returns 400 when comedianId is missing", async () => {
      const req = makeRequest("http://localhost/api/podcast-pipeline/episodes");
      const res = await getEpisodes(req);
      expect(res.status).toBe(400);
    });

    it("returns episodes for a comedian", async () => {
      vi.mocked(getRecentEpisodes).mockResolvedValue([{ id: "ep1" }] as never);

      const req = makeRequest("http://localhost/api/podcast-pipeline/episodes?comedianId=c1");
      const res = await getEpisodes(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toHaveLength(1);
    });
  });

  // ─── POST /ticket-links ───────────────────────────────────────────

  describe("POST /ticket-links", () => {
    it("creates a ticket link when authenticated", async () => {
      mockSession.mockResolvedValue({ user: { id: "u1" } } as never);
      mockGetComedian.mockResolvedValue({ id: "c1" } as never);
      vi.mocked(createPodcastTicketLink).mockResolvedValue({ id: "link1" } as never);

      const req = makeRequest("http://localhost/api/podcast-pipeline/ticket-links", {
        method: "POST",
        body: JSON.stringify({ episodeId: "ep1", eventId: "ev1" }),
      });
      const res = await postTicketLink(req);
      expect(res.status).toBe(201);
    });
  });

  // ─── GET /ticket-links ────────────────────────────────────────────

  describe("GET /ticket-links", () => {
    it("returns conversion stats for a comedian", async () => {
      vi.mocked(getPodcastConversionStats).mockResolvedValue({
        totalClicks: 100,
        totalPurchases: 10,
        totalRevenue: 250,
        conversionRate: 0.1,
      });

      const req = makeRequest("http://localhost/api/podcast-pipeline/ticket-links?comedianId=c1");
      const res = await getTicketLinkStats(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.totalClicks).toBe(100);
    });
  });

  // ─── POST /ticket-links/click ─────────────────────────────────────

  describe("POST /ticket-links/click", () => {
    it("records a click on a ticket link", async () => {
      vi.mocked(recordPodcastClick).mockResolvedValue({ id: "link1", clicks: 1 } as never);

      const req = makeRequest("http://localhost/api/podcast-pipeline/ticket-links/click", {
        method: "POST",
        body: JSON.stringify({ linkId: "link1" }),
      });
      const res = await postClick(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.clicks).toBe(1);
    });

    it("returns 400 when linkId is missing", async () => {
      const req = makeRequest("http://localhost/api/podcast-pipeline/ticket-links/click", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const res = await postClick(req);
      expect(res.status).toBe(400);
    });
  });

  // ─── POST /live-recording ─────────────────────────────────────────

  describe("POST /live-recording", () => {
    it("sets up a live recording session", async () => {
      mockSession.mockResolvedValue({ user: { id: "u1" } } as never);
      mockGetComedian.mockResolvedValue({ id: "c1" } as never);
      vi.mocked(setupLiveRecording).mockResolvedValue({ id: "ses1", status: "PLANNED" } as never);

      const req = makeRequest("http://localhost/api/podcast-pipeline/live-recording", {
        method: "POST",
        body: JSON.stringify({ eventId: "ev1", podcastId: "pod1" }),
      });
      const res = await postRecording(req);
      expect(res.status).toBe(201);
    });
  });

  // ─── PATCH /live-recording/[id] ───────────────────────────────────

  describe("PATCH /live-recording/[id]", () => {
    it("updates recording status", async () => {
      mockSession.mockResolvedValue({ user: { id: "u1" } } as never);
      vi.mocked(updateRecordingStatus).mockResolvedValue({ id: "ses1", status: "RECORDING" } as never);

      const req = makeRequest("http://localhost/api/podcast-pipeline/live-recording/ses1", {
        method: "PATCH",
        body: JSON.stringify({ status: "RECORDING" }),
      });
      const res = await patchRecording(req, { params: { id: "ses1" } });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe("RECORDING");
    });

    it("returns 400 for invalid status", async () => {
      mockSession.mockResolvedValue({ user: { id: "u1" } } as never);

      const req = makeRequest("http://localhost/api/podcast-pipeline/live-recording/ses1", {
        method: "PATCH",
        body: JSON.stringify({ status: "INVALID" }),
      });
      const res = await patchRecording(req, { params: { id: "ses1" } });
      expect(res.status).toBe(400);
    });
  });

  // ─── GET /live-recording ─────────────────────────────────────────

  describe("GET /live-recording", () => {
    it("returns 400 when comedianId is missing", async () => {
      const req = makeRequest("http://localhost/api/podcast-pipeline/live-recording");
      const res = await getRecordings(req);
      expect(res.status).toBe(400);
    });

    it("returns recording sessions for a comedian", async () => {
      vi.mocked(getLiveRecordingSessions).mockResolvedValue([
        { id: "ses1", status: "PLANNED" },
        { id: "ses2", status: "PUBLISHED" },
      ] as never);

      const req = makeRequest("http://localhost/api/podcast-pipeline/live-recording?comedianId=c1");
      const res = await getRecordings(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toHaveLength(2);
    });
  });

  // ─── PATCH /live-recording/[id] - unauthenticated ─────────────────

  describe("PATCH /live-recording/[id] - auth", () => {
    it("returns 401 when not authenticated", async () => {
      mockSession.mockResolvedValue(null);

      const req = makeRequest("http://localhost/api/podcast-pipeline/live-recording/ses1", {
        method: "PATCH",
        body: JSON.stringify({ status: "RECORDING" }),
      });
      const res = await patchRecording(req, { params: { id: "ses1" } });
      expect(res.status).toBe(401);
    });
  });

  // ─── POST /podcasts - missing fields ──────────────────────────────

  describe("POST /podcasts - validation", () => {
    it("returns 400 when required fields are missing", async () => {
      mockSession.mockResolvedValue({ user: { id: "u1" } } as never);
      mockGetComedian.mockResolvedValue({ id: "c1" } as never);

      const req = makeRequest("http://localhost/api/podcast-pipeline/podcasts", {
        method: "POST",
        body: JSON.stringify({ title: "Pod" }),
      });
      const res = await postPodcast(req);
      expect(res.status).toBe(400);
    });
  });

  // ─── POST /ticket-links - validation ──────────────────────────────

  describe("POST /ticket-links - validation", () => {
    it("returns 400 when episodeId or eventId is missing", async () => {
      mockSession.mockResolvedValue({ user: { id: "u1" } } as never);
      mockGetComedian.mockResolvedValue({ id: "c1" } as never);

      const req = makeRequest("http://localhost/api/podcast-pipeline/ticket-links", {
        method: "POST",
        body: JSON.stringify({ episodeId: "ep1" }),
      });
      const res = await postTicketLink(req);
      expect(res.status).toBe(400);
    });
  });

  // ─── POST /live-recording - validation ────────────────────────────

  describe("POST /live-recording - validation", () => {
    it("returns 400 when eventId or podcastId is missing", async () => {
      mockSession.mockResolvedValue({ user: { id: "u1" } } as never);
      mockGetComedian.mockResolvedValue({ id: "c1" } as never);

      const req = makeRequest("http://localhost/api/podcast-pipeline/live-recording", {
        method: "POST",
        body: JSON.stringify({ eventId: "ev1" }),
      });
      const res = await postRecording(req);
      expect(res.status).toBe(400);
    });
  });

  // ─── GET /conversion ──────────────────────────────────────────────

  describe("GET /conversion", () => {
    it("returns 400 when comedianId is missing", async () => {
      const req = makeRequest("http://localhost/api/podcast-pipeline/conversion");
      const res = await getConversion(req);
      expect(res.status).toBe(400);
    });

    it("returns listener-to-attendee conversion stats", async () => {
      vi.mocked(getListenerToAttendeeConversion).mockResolvedValue({
        totalListeners: 5000,
        totalAttendees: 100,
        conversionRate: 0.02,
      });

      const req = makeRequest("http://localhost/api/podcast-pipeline/conversion?comedianId=c1");
      const res = await getConversion(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.conversionRate).toBe(0.02);
    });
  });

  // ─── GET /suggestions ─────────────────────────────────────────────

  describe("GET /suggestions", () => {
    it("returns 400 when comedianId is missing", async () => {
      const req = makeRequest("http://localhost/api/podcast-pipeline/suggestions");
      const res = await getSuggestions(req);
      expect(res.status).toBe(400);
    });

    it("returns suggested events for podcast promotion", async () => {
      vi.mocked(suggestPodcastTicketLinks).mockResolvedValue([
        { event: { id: "ev1" }, podcasts: [] },
      ] as never);

      const req = makeRequest("http://localhost/api/podcast-pipeline/suggestions?comedianId=c1");
      const res = await getSuggestions(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toHaveLength(1);
    });
  });
});
