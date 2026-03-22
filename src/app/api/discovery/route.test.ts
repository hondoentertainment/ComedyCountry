import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/discovery-engine", () => ({
  recordSignal: vi.fn(),
  generateForYouFeed: vi.fn(),
  generateHappeningTonightFeed: vi.fn(),
  generateTrendingNearYouFeed: vi.fn(),
  generateFriendsAttendingFeed: vi.fn(),
  getSocialProof: vi.fn(),
  computeSocialProof: vi.fn(),
  getDiscoveryProfile: vi.fn(),
  computeDiscoveryProfile: vi.fn(),
  getDiscoveryInsights: vi.fn(),
  applyDiscoveryBoost: vi.fn(),
  getActiveBoosts: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 59 }),
  getRateLimitKey: vi.fn().mockReturnValue("127.0.0.1"),
}));

import { getServerSession } from "next-auth";
import {
  recordSignal,
  generateForYouFeed,
  generateHappeningTonightFeed,
  generateTrendingNearYouFeed,
  generateFriendsAttendingFeed,
  getSocialProof,
  computeSocialProof,
  getDiscoveryProfile,
  computeDiscoveryProfile,
  getDiscoveryInsights,
  applyDiscoveryBoost,
  getActiveBoosts,
} from "@/lib/discovery-engine";

import { POST as signalPOST } from "./signal/route";
import { GET as forYouGET } from "./for-you/route";
import { GET as tonightGET } from "./tonight/route";
import { GET as trendingGET } from "./trending-nearby/route";
import { GET as friendsGET } from "./friends-going/route";
import { GET as socialProofGET } from "./social-proof/route";
import { GET as profileGET } from "./profile/route";
import { GET as insightsGET } from "./insights/route";
import { POST as boostPOST, GET as boostGET } from "./boost/route";

const authedSession = {
  user: { id: "user-1", email: "test@example.com", name: "Test" },
  expires: "",
};

const adminSession = {
  user: { id: "admin-1", email: "admin@example.com", name: "Admin", role: "ADMIN" },
  expires: "",
};

describe("/api/discovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(authedSession);
  });

  /* ---------------------------------------------------------------------- */
  /*  POST /api/discovery/signal                                            */
  /* ---------------------------------------------------------------------- */

  describe("POST /signal", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = new Request("http://localhost/api/discovery/signal", {
        method: "POST",
        body: JSON.stringify({ signalType: "VIEW", entityType: "EVENT", entityId: "e1" }),
      });

      const res = await signalPOST(req);
      expect(res.status).toBe(401);
    });

    it("records signal and returns 201", async () => {
      vi.mocked(recordSignal).mockResolvedValue({
        id: "sig-1",
        userId: "user-1",
        signalType: "VIEW",
        entityType: "EVENT",
        entityId: "e1",
        weight: 1.0,
        createdAt: new Date(),
      } as never);

      const req = new Request("http://localhost/api/discovery/signal", {
        method: "POST",
        body: JSON.stringify({ signalType: "VIEW", entityType: "EVENT", entityId: "e1" }),
      });

      const res = await signalPOST(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.signalType).toBe("VIEW");
    });

    it("returns 400 for missing fields", async () => {
      const req = new Request("http://localhost/api/discovery/signal", {
        method: "POST",
        body: JSON.stringify({ signalType: "VIEW" }),
      });

      const res = await signalPOST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid signalType", async () => {
      const req = new Request("http://localhost/api/discovery/signal", {
        method: "POST",
        body: JSON.stringify({ signalType: "INVALID", entityType: "EVENT", entityId: "e1" }),
      });

      const res = await signalPOST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid entityType", async () => {
      const req = new Request("http://localhost/api/discovery/signal", {
        method: "POST",
        body: JSON.stringify({ signalType: "VIEW", entityType: "INVALID", entityId: "e1" }),
      });

      const res = await signalPOST(req);
      expect(res.status).toBe(400);
    });
  });

  /* ---------------------------------------------------------------------- */
  /*  GET /api/discovery/for-you                                            */
  /* ---------------------------------------------------------------------- */

  describe("GET /for-you", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = new Request("http://localhost/api/discovery/for-you");
      const res = await forYouGET(req);
      expect(res.status).toBe(401);
    });

    it("returns personalized feed", async () => {
      vi.mocked(generateForYouFeed).mockResolvedValue([
        { entityType: "EVENT", entityId: "e1", score: 85, title: "Dark Night" },
      ] as never);

      const req = new Request("http://localhost/api/discovery/for-you");
      const res = await forYouGET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.count).toBe(1);
    });
  });

  /* ---------------------------------------------------------------------- */
  /*  GET /api/discovery/tonight                                            */
  /* ---------------------------------------------------------------------- */

  describe("GET /tonight", () => {
    it("returns tonight's feed", async () => {
      vi.mocked(generateHappeningTonightFeed).mockResolvedValue([
        { entityType: "EVENT", entityId: "e1", score: 70, title: "Tonight Show" },
      ] as never);

      const req = new Request("http://localhost/api/discovery/tonight");
      const res = await tonightGET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.items).toHaveLength(1);
    });
  });

  /* ---------------------------------------------------------------------- */
  /*  GET /api/discovery/trending-nearby                                    */
  /* ---------------------------------------------------------------------- */

  describe("GET /trending-nearby", () => {
    it("returns 400 when lat/lng missing", async () => {
      const req = new Request("http://localhost/api/discovery/trending-nearby");
      const res = await trendingGET(req);
      expect(res.status).toBe(400);
    });

    it("returns trending feed with location", async () => {
      vi.mocked(generateTrendingNearYouFeed).mockResolvedValue([
        { entityType: "EVENT", entityId: "e1", score: 90, title: "Viral Show" },
      ] as never);

      const req = new Request("http://localhost/api/discovery/trending-nearby?lat=36.16&lng=-86.78");
      const res = await trendingGET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.items).toHaveLength(1);
    });
  });

  /* ---------------------------------------------------------------------- */
  /*  GET /api/discovery/friends-going                                      */
  /* ---------------------------------------------------------------------- */

  describe("GET /friends-going", () => {
    it("returns friends attending feed", async () => {
      vi.mocked(generateFriendsAttendingFeed).mockResolvedValue([
        { entityType: "EVENT", entityId: "e1", score: 60, title: "Group Show", socialProof: { friendsAttending: 3, totalAttending: 50, trendingScore: 10, buzzLevel: "MEDIUM" } },
      ] as never);

      const req = new Request("http://localhost/api/discovery/friends-going");
      const res = await friendsGET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.items[0].socialProof.friendsAttending).toBe(3);
    });
  });

  /* ---------------------------------------------------------------------- */
  /*  GET /api/discovery/social-proof                                       */
  /* ---------------------------------------------------------------------- */

  describe("GET /social-proof", () => {
    it("returns 400 when params missing", async () => {
      const req = new Request("http://localhost/api/discovery/social-proof");
      const res = await socialProofGET(req);
      expect(res.status).toBe(400);
    });

    it("returns social proof for entity", async () => {
      vi.mocked(getSocialProof).mockResolvedValue({
        entityType: "EVENT",
        entityId: "e1",
        friendsAttending: 2,
        totalAttending: 100,
        trendingScore: 50,
        buzzLevel: "HIGH",
      } as never);

      const req = new Request("http://localhost/api/discovery/social-proof?entityType=EVENT&entityId=e1");
      const res = await socialProofGET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.buzzLevel).toBe("HIGH");
    });

    it("returns 404 when no social proof exists", async () => {
      vi.mocked(getSocialProof).mockResolvedValue(null as never);

      const req = new Request("http://localhost/api/discovery/social-proof?entityType=EVENT&entityId=e-none");
      const res = await socialProofGET(req);
      expect(res.status).toBe(404);
    });
  });

  /* ---------------------------------------------------------------------- */
  /*  GET /api/discovery/profile                                            */
  /* ---------------------------------------------------------------------- */

  describe("GET /profile", () => {
    it("returns existing profile", async () => {
      vi.mocked(getDiscoveryProfile).mockResolvedValue({
        userId: "user-1",
        preferredGenres: ["dark"],
        preferredVenues: [],
        preferredDays: [],
        averageSpend: 25,
        discoveryOpenness: 0.7,
        lastComputedAt: new Date(),
      } as never);

      const res = await profileGET(new Request("http://localhost:3000"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.preferredGenres).toEqual(["dark"]);
    });

    it("computes profile if none exists", async () => {
      vi.mocked(getDiscoveryProfile).mockResolvedValue(null as never);
      vi.mocked(computeDiscoveryProfile).mockResolvedValue({
        userId: "user-1",
        preferredGenres: [],
        preferredVenues: [],
        preferredDays: [],
        averageSpend: 0,
        discoveryOpenness: 0.5,
        lastComputedAt: new Date(),
      } as never);

      const res = await profileGET(new Request("http://localhost:3000"));
      expect(res.status).toBe(200);
      expect(vi.mocked(computeDiscoveryProfile)).toHaveBeenCalled();
    });
  });

  /* ---------------------------------------------------------------------- */
  /*  GET /api/discovery/insights                                           */
  /* ---------------------------------------------------------------------- */

  describe("GET /insights", () => {
    it("returns insights for user", async () => {
      vi.mocked(getDiscoveryInsights).mockResolvedValue([
        { entityId: "e1", entityType: "EVENT", reason: "Because you like dark comedy" },
      ] as never);

      const res = await insightsGET(new Request("http://localhost:3000"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.insights).toHaveLength(1);
      expect(data.insights[0].reason).toContain("dark comedy");
    });
  });

  /* ---------------------------------------------------------------------- */
  /*  POST /api/discovery/boost                                             */
  /* ---------------------------------------------------------------------- */

  describe("POST /boost", () => {
    it("returns 403 for non-admin users", async () => {
      const req = new Request("http://localhost/api/discovery/boost", {
        method: "POST",
        body: JSON.stringify({ entityType: "EVENT", entityId: "e1", boostType: "TRENDING", durationHours: 24 }),
      });

      const res = await boostPOST(req);
      expect(res.status).toBe(403);
    });

    it("creates boost for admin user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(adminSession);
      vi.mocked(applyDiscoveryBoost).mockResolvedValue({
        id: "boost-1",
        entityType: "EVENT",
        entityId: "e1",
        boostType: "TRENDING",
        boostMultiplier: 1.6,
        expiresAt: new Date(),
      } as never);

      const req = new Request("http://localhost/api/discovery/boost", {
        method: "POST",
        body: JSON.stringify({ entityType: "EVENT", entityId: "e1", boostType: "TRENDING", durationHours: 24 }),
      });

      const res = await boostPOST(req);
      expect(res.status).toBe(201);
    });

    it("returns 400 for missing fields", async () => {
      vi.mocked(getServerSession).mockResolvedValue(adminSession);

      const req = new Request("http://localhost/api/discovery/boost", {
        method: "POST",
        body: JSON.stringify({ entityType: "EVENT" }),
      });

      const res = await boostPOST(req);
      expect(res.status).toBe(400);
    });
  });

  /* ---------------------------------------------------------------------- */
  /*  GET /api/discovery/boost                                              */
  /* ---------------------------------------------------------------------- */

  describe("GET /boost", () => {
    it("returns active boosts", async () => {
      vi.mocked(getActiveBoosts).mockResolvedValue([
        { id: "boost-1", entityType: "EVENT", entityId: "e1", boostType: "TRENDING", boostMultiplier: 1.6, expiresAt: new Date() },
      ] as never);

      const res = await boostGET(new Request("http://localhost:3000"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.boosts).toHaveLength(1);
      expect(data.count).toBe(1);
    });
  });
});
