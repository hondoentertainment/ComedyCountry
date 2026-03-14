import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  recordSignal,
  computeDiscoveryProfile,
  getDiscoveryProfile,
  generateForYouFeed,
  generateHappeningTonightFeed,
  generateTrendingNearYouFeed,
  generateFriendsAttendingFeed,
  computeSocialProof,
  getSocialProof,
  applyDiscoveryBoost,
  getActiveBoosts,
  scoreFeedItem,
  computeBuzzLevel,
  getDiscoveryInsights,
} from "./discovery-engine";
import type { FeedItem, DiscoveryProfile, SocialProofData } from "./discovery-engine";

vi.mock("./prisma", () => ({
  prisma: {
    discoverySignal: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    userDiscoveryProfile: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    event: { findMany: vi.fn() },
    eventAttendance: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    socialProof: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    discoveryBoost: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    userFollow: { findMany: vi.fn() },
    comedian: { findMany: vi.fn() },
    personalizedFeed: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  discoverySignal: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  userDiscoveryProfile: {
    upsert: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  event: { findMany: ReturnType<typeof vi.fn> };
  eventAttendance: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  socialProof: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
  discoveryBoost: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  userFollow: { findMany: ReturnType<typeof vi.fn> };
  comedian: { findMany: ReturnType<typeof vi.fn> };
  personalizedFeed: {
    upsert: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
};

describe("discovery-engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ------------------------------------------------------------------------ */
  /*  recordSignal                                                            */
  /* ------------------------------------------------------------------------ */

  describe("recordSignal", () => {
    it("records a VIEW signal with weight 1.0", async () => {
      mockPrisma.discoverySignal.create.mockResolvedValue({
        id: "sig-1",
        userId: "user-1",
        signalType: "VIEW",
        entityType: "EVENT",
        entityId: "event-1",
        weight: 1.0,
        createdAt: new Date(),
      });

      const result = await recordSignal("user-1", {
        signalType: "VIEW",
        entityType: "EVENT",
        entityId: "event-1",
      });

      expect(mockPrisma.discoverySignal.create).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          signalType: "VIEW",
          entityType: "EVENT",
          entityId: "event-1",
          weight: 1.0,
        },
      });
      expect(result.weight).toBe(1.0);
    });

    it("records a PURCHASE signal with weight 6.0", async () => {
      mockPrisma.discoverySignal.create.mockResolvedValue({
        id: "sig-2",
        userId: "user-1",
        signalType: "PURCHASE",
        entityType: "EVENT",
        entityId: "event-2",
        weight: 6.0,
        createdAt: new Date(),
      });

      const result = await recordSignal("user-1", {
        signalType: "PURCHASE",
        entityType: "EVENT",
        entityId: "event-2",
      });

      expect(result.weight).toBe(6.0);
      expect(mockPrisma.discoverySignal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ weight: 6.0 }),
      });
    });

    it("records an ATTEND signal with weight 5.0", async () => {
      mockPrisma.discoverySignal.create.mockResolvedValue({
        id: "sig-3",
        userId: "user-1",
        signalType: "ATTEND",
        entityType: "COMEDIAN",
        entityId: "com-1",
        weight: 5.0,
        createdAt: new Date(),
      });

      const result = await recordSignal("user-1", {
        signalType: "ATTEND",
        entityType: "COMEDIAN",
        entityId: "com-1",
      });

      expect(result.weight).toBe(5.0);
    });

    it("records a CLICK signal with weight 2.0", async () => {
      mockPrisma.discoverySignal.create.mockResolvedValue({
        id: "sig-4",
        userId: "user-1",
        signalType: "CLICK",
        entityType: "CLIP",
        entityId: "clip-1",
        weight: 2.0,
        createdAt: new Date(),
      });

      const result = await recordSignal("user-1", {
        signalType: "CLICK",
        entityType: "CLIP",
        entityId: "clip-1",
      });

      expect(result.weight).toBe(2.0);
    });

    it("records a FOLLOW signal with weight 4.0", async () => {
      mockPrisma.discoverySignal.create.mockResolvedValue({
        id: "sig-5",
        userId: "user-1",
        signalType: "FOLLOW",
        entityType: "COMEDIAN",
        entityId: "com-2",
        weight: 4.0,
        createdAt: new Date(),
      });

      const result = await recordSignal("user-1", {
        signalType: "FOLLOW",
        entityType: "COMEDIAN",
        entityId: "com-2",
      });

      expect(result.weight).toBe(4.0);
    });

    it("records a SHARE signal with weight 3.0", async () => {
      mockPrisma.discoverySignal.create.mockResolvedValue({
        id: "sig-6",
        userId: "user-1",
        signalType: "SHARE",
        entityType: "EVENT",
        entityId: "event-3",
        weight: 3.0,
        createdAt: new Date(),
      });

      const result = await recordSignal("user-1", {
        signalType: "SHARE",
        entityType: "EVENT",
        entityId: "event-3",
      });

      expect(result.weight).toBe(3.0);
    });

    it("records a REVIEW signal with weight 4.5", async () => {
      mockPrisma.discoverySignal.create.mockResolvedValue({
        id: "sig-7",
        userId: "user-1",
        signalType: "REVIEW",
        entityType: "EVENT",
        entityId: "event-4",
        weight: 4.5,
        createdAt: new Date(),
      });

      const result = await recordSignal("user-1", {
        signalType: "REVIEW",
        entityType: "EVENT",
        entityId: "event-4",
      });

      expect(result.weight).toBe(4.5);
    });

    it("records a CLIP_WATCH signal with weight 1.5", async () => {
      mockPrisma.discoverySignal.create.mockResolvedValue({
        id: "sig-8",
        userId: "user-1",
        signalType: "CLIP_WATCH",
        entityType: "CLIP",
        entityId: "clip-2",
        weight: 1.5,
        createdAt: new Date(),
      });

      const result = await recordSignal("user-1", {
        signalType: "CLIP_WATCH",
        entityType: "CLIP",
        entityId: "clip-2",
      });

      expect(result.weight).toBe(1.5);
    });

    it("records a CHECKIN signal with weight 5.0", async () => {
      mockPrisma.discoverySignal.create.mockResolvedValue({
        id: "sig-9",
        userId: "user-1",
        signalType: "CHECKIN",
        entityType: "VENUE",
        entityId: "venue-1",
        weight: 5.0,
        createdAt: new Date(),
      });

      const result = await recordSignal("user-1", {
        signalType: "CHECKIN",
        entityType: "VENUE",
        entityId: "venue-1",
      });

      expect(result.weight).toBe(5.0);
    });
  });

  /* ------------------------------------------------------------------------ */
  /*  computeDiscoveryProfile                                                 */
  /* ------------------------------------------------------------------------ */

  describe("computeDiscoveryProfile", () => {
    it("computes genre preferences from past event attendance signals", async () => {
      mockPrisma.discoverySignal.findMany.mockResolvedValue([
        { userId: "user-1", signalType: "ATTEND", entityType: "EVENT", entityId: "event-1", weight: 5.0, createdAt: new Date() },
        { userId: "user-1", signalType: "ATTEND", entityType: "EVENT", entityId: "event-2", weight: 5.0, createdAt: new Date() },
      ]);

      mockPrisma.event.findMany.mockResolvedValue([
        {
          id: "event-1",
          date: new Date("2025-01-10"),
          comedians: [{ comedian: { genres: [{ genre: "dark" }] } }],
          venue: { id: "v1" },
        },
        {
          id: "event-2",
          date: new Date("2025-01-15"),
          comedians: [{ comedian: { genres: [{ genre: "dark" }, { genre: "observational" }] } }],
          venue: { id: "v1" },
        },
      ]);

      mockPrisma.userDiscoveryProfile.upsert.mockResolvedValue({});

      const profile = await computeDiscoveryProfile("user-1");

      expect(profile.preferredGenres).toContain("dark");
      expect(profile.preferredGenres[0]).toBe("dark"); // Most frequent
      expect(profile.userId).toBe("user-1");
    });

    it("computes venue preferences from venue signals", async () => {
      mockPrisma.discoverySignal.findMany.mockResolvedValue([
        { userId: "user-1", signalType: "CHECKIN", entityType: "VENUE", entityId: "venue-a", weight: 5.0, createdAt: new Date() },
        { userId: "user-1", signalType: "CHECKIN", entityType: "VENUE", entityId: "venue-a", weight: 5.0, createdAt: new Date() },
        { userId: "user-1", signalType: "CHECKIN", entityType: "VENUE", entityId: "venue-b", weight: 5.0, createdAt: new Date() },
      ]);

      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.userDiscoveryProfile.upsert.mockResolvedValue({});

      const profile = await computeDiscoveryProfile("user-1");

      expect(profile.preferredVenues[0]).toBe("venue-a");
      expect(profile.preferredVenues).toContain("venue-b");
    });

    it("computes day preferences from event dates", async () => {
      const saturday = new Date("2025-01-11"); // Saturday
      const friday = new Date("2025-01-10"); // Friday

      mockPrisma.discoverySignal.findMany.mockResolvedValue([
        { userId: "user-1", signalType: "ATTEND", entityType: "EVENT", entityId: "event-1", weight: 5.0, createdAt: new Date() },
        { userId: "user-1", signalType: "ATTEND", entityType: "EVENT", entityId: "event-2", weight: 5.0, createdAt: new Date() },
      ]);

      mockPrisma.event.findMany.mockResolvedValue([
        {
          id: "event-1",
          date: saturday,
          comedians: [{ comedian: { genres: [{ genre: "standup" }] } }],
          venue: { id: "v1" },
        },
        {
          id: "event-2",
          date: friday,
          comedians: [{ comedian: { genres: [{ genre: "improv" }] } }],
          venue: { id: "v2" },
        },
      ]);

      mockPrisma.userDiscoveryProfile.upsert.mockResolvedValue({});

      const profile = await computeDiscoveryProfile("user-1");

      expect(profile.preferredDays.length).toBeGreaterThan(0);
    });

    it("computes discovery openness from signal diversity", async () => {
      // Many signals, all different entities = high openness
      mockPrisma.discoverySignal.findMany.mockResolvedValue([
        { userId: "user-1", signalType: "VIEW", entityType: "EVENT", entityId: "e1", weight: 1.0, createdAt: new Date() },
        { userId: "user-1", signalType: "VIEW", entityType: "EVENT", entityId: "e2", weight: 1.0, createdAt: new Date() },
        { userId: "user-1", signalType: "VIEW", entityType: "EVENT", entityId: "e3", weight: 1.0, createdAt: new Date() },
        { userId: "user-1", signalType: "VIEW", entityType: "EVENT", entityId: "e4", weight: 1.0, createdAt: new Date() },
      ]);

      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.userDiscoveryProfile.upsert.mockResolvedValue({});

      const profile = await computeDiscoveryProfile("user-1");

      // 4 unique entities / 4 signals = 1.0
      expect(profile.discoveryOpenness).toBe(1.0);
    });

    it("computes low openness for repeated interactions", async () => {
      // Many signals, same entity = low openness
      mockPrisma.discoverySignal.findMany.mockResolvedValue([
        { userId: "user-1", signalType: "VIEW", entityType: "EVENT", entityId: "e1", weight: 1.0, createdAt: new Date() },
        { userId: "user-1", signalType: "CLICK", entityType: "EVENT", entityId: "e1", weight: 2.0, createdAt: new Date() },
        { userId: "user-1", signalType: "SHARE", entityType: "EVENT", entityId: "e1", weight: 3.0, createdAt: new Date() },
        { userId: "user-1", signalType: "REVIEW", entityType: "EVENT", entityId: "e1", weight: 4.5, createdAt: new Date() },
      ]);

      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.userDiscoveryProfile.upsert.mockResolvedValue({});

      const profile = await computeDiscoveryProfile("user-1");

      // 1 unique entity / 4 signals = 0.25
      expect(profile.discoveryOpenness).toBe(0.25);
    });

    it("upserts profile to database", async () => {
      mockPrisma.discoverySignal.findMany.mockResolvedValue([]);
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.userDiscoveryProfile.upsert.mockResolvedValue({});

      await computeDiscoveryProfile("user-1");

      expect(mockPrisma.userDiscoveryProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1" },
        }),
      );
    });
  });

  /* ------------------------------------------------------------------------ */
  /*  getDiscoveryProfile                                                     */
  /* ------------------------------------------------------------------------ */

  describe("getDiscoveryProfile", () => {
    it("returns cached profile from database", async () => {
      const lastComputedAt = new Date();
      mockPrisma.userDiscoveryProfile.findUnique.mockResolvedValue({
        userId: "user-1",
        preferredGenres: ["dark", "observational"],
        preferredVenues: ["v1"],
        preferredDays: ["Saturday"],
        averageSpend: 25.0,
        discoveryOpenness: 0.7,
        lastComputedAt,
      });

      const profile = await getDiscoveryProfile("user-1");

      expect(profile).not.toBeNull();
      expect(profile!.preferredGenres).toEqual(["dark", "observational"]);
      expect(profile!.averageSpend).toBe(25.0);
      expect(profile!.discoveryOpenness).toBe(0.7);
    });

    it("returns null when no profile exists", async () => {
      mockPrisma.userDiscoveryProfile.findUnique.mockResolvedValue(null);

      const profile = await getDiscoveryProfile("user-1");

      expect(profile).toBeNull();
    });
  });

  /* ------------------------------------------------------------------------ */
  /*  generateForYouFeed                                                      */
  /* ------------------------------------------------------------------------ */

  describe("generateForYouFeed", () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    it("ranks events with taste match higher than random", async () => {
      mockPrisma.userDiscoveryProfile.findUnique.mockResolvedValue({
        userId: "user-1",
        preferredGenres: ["dark"],
        preferredVenues: [],
        preferredDays: [],
        averageSpend: 0,
        discoveryOpenness: 0.5,
        lastComputedAt: new Date(),
      });

      mockPrisma.event.findMany.mockResolvedValue([
        {
          id: "event-match",
          title: "Dark Comedy Night",
          date: futureDate,
          venue: { id: "v1", name: "Club A", latitude: null, longitude: null },
          comedians: [{ comedian: { id: "c1", genres: [{ genre: "dark" }] } }],
        },
        {
          id: "event-random",
          title: "Random Show",
          date: futureDate,
          venue: { id: "v2", name: "Club B", latitude: null, longitude: null },
          comedians: [{ comedian: { id: "c2", genres: [{ genre: "improv" }] } }],
        },
      ]);

      mockPrisma.socialProof.findUnique.mockResolvedValue(null);
      mockPrisma.discoveryBoost.findMany.mockResolvedValue([]);

      const feed = await generateForYouFeed("user-1");

      expect(feed.length).toBe(2);
      expect(feed[0].entityId).toBe("event-match");
      expect(feed[0].score).toBeGreaterThan(feed[1].score);
    });

    it("boosts score when social proof has friends attending", async () => {
      mockPrisma.userDiscoveryProfile.findUnique.mockResolvedValue({
        userId: "user-1",
        preferredGenres: [],
        preferredVenues: [],
        preferredDays: [],
        averageSpend: 0,
        discoveryOpenness: 0.5,
        lastComputedAt: new Date(),
      });

      mockPrisma.event.findMany.mockResolvedValue([
        {
          id: "event-social",
          title: "Social Show",
          date: futureDate,
          venue: { id: "v1", name: "Club A", latitude: null, longitude: null },
          comedians: [{ comedian: { id: "c1", genres: [{ genre: "standup" }] } }],
        },
        {
          id: "event-solo",
          title: "Solo Show",
          date: futureDate,
          venue: { id: "v2", name: "Club B", latitude: null, longitude: null },
          comedians: [{ comedian: { id: "c2", genres: [{ genre: "standup" }] } }],
        },
      ]);

      // First event has social proof, second doesn't
      mockPrisma.socialProof.findUnique
        .mockResolvedValueOnce({
          entityType: "EVENT",
          entityId: "event-social",
          friendsAttending: 5,
          totalAttending: 50,
          trendingScore: 10,
          buzzLevel: "MEDIUM",
        })
        .mockResolvedValueOnce(null);

      mockPrisma.userFollow.findMany.mockResolvedValue([
        { followingId: "friend-1" },
      ]);

      mockPrisma.eventAttendance.count.mockResolvedValue(3);
      mockPrisma.discoveryBoost.findMany.mockResolvedValue([]);

      const feed = await generateForYouFeed("user-1");

      const socialEvent = feed.find((f) => f.entityId === "event-social")!;
      const soloEvent = feed.find((f) => f.entityId === "event-solo")!;

      expect(socialEvent.score).toBeGreaterThan(soloEvent.score);
    });

    it("respects limit parameter", async () => {
      mockPrisma.userDiscoveryProfile.findUnique.mockResolvedValue(null);
      mockPrisma.event.findMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          id: `event-${i}`,
          title: `Show ${i}`,
          date: futureDate,
          venue: { id: `v${i}`, name: `Club ${i}`, latitude: null, longitude: null },
          comedians: [{ comedian: { id: `c${i}`, genres: [] } }],
        })),
      );
      mockPrisma.socialProof.findUnique.mockResolvedValue(null);
      mockPrisma.discoveryBoost.findMany.mockResolvedValue([]);

      const feed = await generateForYouFeed("user-1", 3);

      expect(feed.length).toBe(3);
    });

    it("applies discovery boosts to feed items", async () => {
      mockPrisma.userDiscoveryProfile.findUnique.mockResolvedValue(null);

      mockPrisma.event.findMany.mockResolvedValue([
        {
          id: "event-boosted",
          title: "Boosted Show",
          date: futureDate,
          venue: { id: "v1", name: "Club A", latitude: null, longitude: null },
          comedians: [{ comedian: { id: "c1", genres: [] } }],
        },
        {
          id: "event-normal",
          title: "Normal Show",
          date: futureDate,
          venue: { id: "v2", name: "Club B", latitude: null, longitude: null },
          comedians: [{ comedian: { id: "c2", genres: [] } }],
        },
      ]);

      mockPrisma.socialProof.findUnique.mockResolvedValue(null);

      // Boosted event
      mockPrisma.discoveryBoost.findMany
        .mockResolvedValueOnce([
          { boostMultiplier: 2.5, boostType: "EDITORIAL_PICK", expiresAt: new Date(Date.now() + 3600000) },
        ])
        .mockResolvedValueOnce([]);

      const feed = await generateForYouFeed("user-1");

      const boosted = feed.find((f) => f.entityId === "event-boosted")!;
      const normal = feed.find((f) => f.entityId === "event-normal")!;

      expect(boosted.score).toBeGreaterThan(normal.score);
      expect(boosted.boostApplied).toBe(true);
    });
  });

  /* ------------------------------------------------------------------------ */
  /*  generateHappeningTonightFeed                                            */
  /* ------------------------------------------------------------------------ */

  describe("generateHappeningTonightFeed", () => {
    it("filters events to only today's events", async () => {
      mockPrisma.userDiscoveryProfile.findUnique.mockResolvedValue(null);

      mockPrisma.event.findMany.mockResolvedValue([
        {
          id: "tonight-1",
          title: "Tonight Show",
          date: new Date(),
          venue: { id: "v1", name: "Club A", latitude: null, longitude: null },
          comedians: [{ comedian: { id: "c1", genres: [{ genre: "dark" }] } }],
        },
      ]);

      mockPrisma.socialProof.findUnique.mockResolvedValue(null);
      mockPrisma.discoveryBoost.findMany.mockResolvedValue([]);

      const feed = await generateHappeningTonightFeed("user-1");

      expect(feed.length).toBe(1);
      expect(feed[0].entityId).toBe("tonight-1");
    });

    it("ranks tonight's events by relevance to user profile", async () => {
      mockPrisma.userDiscoveryProfile.findUnique.mockResolvedValue({
        userId: "user-1",
        preferredGenres: ["dark"],
        preferredVenues: [],
        preferredDays: [],
        averageSpend: 0,
        discoveryOpenness: 0.5,
        lastComputedAt: new Date(),
      });

      mockPrisma.event.findMany.mockResolvedValue([
        {
          id: "tonight-match",
          title: "Dark Comedy Night",
          date: new Date(),
          venue: { id: "v1", name: "Club A", latitude: null, longitude: null },
          comedians: [{ comedian: { id: "c1", genres: [{ genre: "dark" }] } }],
        },
        {
          id: "tonight-mismatch",
          title: "Improv Night",
          date: new Date(),
          venue: { id: "v2", name: "Club B", latitude: null, longitude: null },
          comedians: [{ comedian: { id: "c2", genres: [{ genre: "improv" }] } }],
        },
      ]);

      mockPrisma.socialProof.findUnique.mockResolvedValue(null);
      mockPrisma.discoveryBoost.findMany.mockResolvedValue([]);

      const feed = await generateHappeningTonightFeed("user-1");

      expect(feed[0].entityId).toBe("tonight-match");
    });

    it("returns empty array when no events tonight", async () => {
      mockPrisma.userDiscoveryProfile.findUnique.mockResolvedValue(null);
      mockPrisma.event.findMany.mockResolvedValue([]);

      const feed = await generateHappeningTonightFeed("user-1");

      expect(feed).toEqual([]);
    });
  });

  /* ------------------------------------------------------------------------ */
  /*  generateTrendingNearYouFeed                                             */
  /* ------------------------------------------------------------------------ */

  describe("generateTrendingNearYouFeed", () => {
    it("scores higher for closer events", async () => {
      mockPrisma.userDiscoveryProfile.findUnique.mockResolvedValue(null);

      mockPrisma.socialProof.findMany.mockResolvedValue([
        { entityType: "EVENT", entityId: "event-near", trendingScore: 50, friendsAttending: 0, totalAttending: 10, buzzLevel: "HIGH" },
        { entityType: "EVENT", entityId: "event-far", trendingScore: 50, friendsAttending: 0, totalAttending: 10, buzzLevel: "HIGH" },
      ]);

      mockPrisma.event.findMany.mockResolvedValue([
        {
          id: "event-near",
          title: "Near Show",
          date: new Date(Date.now() + 86400000),
          venue: { id: "v1", name: "Nearby Club", latitude: 36.16, longitude: -86.78 },
          comedians: [{ comedian: { id: "c1", genres: [] } }],
        },
        {
          id: "event-far",
          title: "Far Show",
          date: new Date(Date.now() + 86400000),
          venue: { id: "v2", name: "Far Club", latitude: 40.71, longitude: -74.01 },
          comedians: [{ comedian: { id: "c2", genres: [] } }],
        },
      ]);

      // Nashville location
      const feed = await generateTrendingNearYouFeed(
        "user-1",
        { lat: 36.16, lng: -86.78 },
      );

      expect(feed[0].entityId).toBe("event-near");
      expect(feed[0].score).toBeGreaterThan(feed[1].score);
    });

    it("includes buzz level in social proof", async () => {
      mockPrisma.userDiscoveryProfile.findUnique.mockResolvedValue(null);

      mockPrisma.socialProof.findMany.mockResolvedValue([
        { entityType: "EVENT", entityId: "event-1", trendingScore: 120, friendsAttending: 0, totalAttending: 100, buzzLevel: "VIRAL" },
      ]);

      mockPrisma.event.findMany.mockResolvedValue([
        {
          id: "event-1",
          title: "Viral Show",
          date: new Date(Date.now() + 86400000),
          venue: { id: "v1", name: "Club", latitude: 36.16, longitude: -86.78 },
          comedians: [{ comedian: { id: "c1", genres: [] } }],
        },
      ]);

      const feed = await generateTrendingNearYouFeed(
        "user-1",
        { lat: 36.16, lng: -86.78 },
      );

      expect(feed[0].socialProof!.buzzLevel).toBe("VIRAL");
    });

    it("returns empty when no trending events", async () => {
      mockPrisma.userDiscoveryProfile.findUnique.mockResolvedValue(null);
      mockPrisma.socialProof.findMany.mockResolvedValue([]);
      mockPrisma.event.findMany.mockResolvedValue([]);

      const feed = await generateTrendingNearYouFeed(
        "user-1",
        { lat: 36.16, lng: -86.78 },
      );

      expect(feed).toEqual([]);
    });
  });

  /* ------------------------------------------------------------------------ */
  /*  generateFriendsAttendingFeed                                            */
  /* ------------------------------------------------------------------------ */

  describe("generateFriendsAttendingFeed", () => {
    it("returns events where friends are attending", async () => {
      mockPrisma.userFollow.findMany.mockResolvedValue([
        { followingId: "friend-1" },
        { followingId: "friend-2" },
      ]);

      const futureDate = new Date(Date.now() + 86400000);

      mockPrisma.eventAttendance.findMany.mockResolvedValue([
        {
          userId: "friend-1",
          event: {
            id: "event-1",
            title: "Comedy Night",
            date: futureDate,
            venue: { id: "v1", name: "Club A" },
            comedians: [],
          },
        },
        {
          userId: "friend-2",
          event: {
            id: "event-1",
            title: "Comedy Night",
            date: futureDate,
            venue: { id: "v1", name: "Club A" },
            comedians: [],
          },
        },
      ]);

      const feed = await generateFriendsAttendingFeed("user-1");

      expect(feed.length).toBe(1);
      expect(feed[0].socialProof!.friendsAttending).toBe(2);
      expect(feed[0].insight).toBe("2 friends going");
    });

    it("ranks events by friend count", async () => {
      mockPrisma.userFollow.findMany.mockResolvedValue([
        { followingId: "friend-1" },
        { followingId: "friend-2" },
        { followingId: "friend-3" },
      ]);

      const futureDate = new Date(Date.now() + 86400000);

      mockPrisma.eventAttendance.findMany.mockResolvedValue([
        {
          userId: "friend-1",
          event: { id: "event-many", title: "Popular Show", date: futureDate, venue: { id: "v1", name: "Club A" }, comedians: [] },
        },
        {
          userId: "friend-2",
          event: { id: "event-many", title: "Popular Show", date: futureDate, venue: { id: "v1", name: "Club A" }, comedians: [] },
        },
        {
          userId: "friend-3",
          event: { id: "event-many", title: "Popular Show", date: futureDate, venue: { id: "v1", name: "Club A" }, comedians: [] },
        },
        {
          userId: "friend-1",
          event: { id: "event-few", title: "Small Show", date: futureDate, venue: { id: "v2", name: "Club B" }, comedians: [] },
        },
      ]);

      const feed = await generateFriendsAttendingFeed("user-1");

      expect(feed[0].entityId).toBe("event-many");
      expect(feed[0].socialProof!.friendsAttending).toBe(3);
    });

    it("returns empty when user has no friends", async () => {
      mockPrisma.userFollow.findMany.mockResolvedValue([]);

      const feed = await generateFriendsAttendingFeed("user-1");

      expect(feed).toEqual([]);
    });

    it("shows singular 'friend' for one friend attending", async () => {
      mockPrisma.userFollow.findMany.mockResolvedValue([
        { followingId: "friend-1" },
      ]);

      mockPrisma.eventAttendance.findMany.mockResolvedValue([
        {
          userId: "friend-1",
          event: {
            id: "event-1",
            title: "Show",
            date: new Date(Date.now() + 86400000),
            venue: { id: "v1", name: "Club" },
            comedians: [],
          },
        },
      ]);

      const feed = await generateFriendsAttendingFeed("user-1");

      expect(feed[0].insight).toBe("1 friend going");
    });
  });

  /* ------------------------------------------------------------------------ */
  /*  computeSocialProof                                                      */
  /* ------------------------------------------------------------------------ */

  describe("computeSocialProof", () => {
    it("computes trending score from signal counts", async () => {
      mockPrisma.discoverySignal.count
        .mockResolvedValueOnce(30) // 24h
        .mockResolvedValueOnce(80); // 7d

      mockPrisma.eventAttendance.count.mockResolvedValue(150);
      mockPrisma.socialProof.upsert.mockResolvedValue({});

      const proof = await computeSocialProof("EVENT", "event-1");

      // trendingScore = 30*3 + 80 = 170
      expect(proof.trendingScore).toBe(170);
      expect(proof.totalAttending).toBe(150);
      expect(proof.buzzLevel).toBe("VIRAL");
    });

    it("computes LOW buzz level for low signals", async () => {
      mockPrisma.discoverySignal.count
        .mockResolvedValueOnce(2) // 24h
        .mockResolvedValueOnce(5); // 7d

      mockPrisma.eventAttendance.count.mockResolvedValue(10);
      mockPrisma.socialProof.upsert.mockResolvedValue({});

      const proof = await computeSocialProof("EVENT", "event-2");

      // trendingScore = 2*3 + 5 = 11
      expect(proof.buzzLevel).toBe("LOW");
    });

    it("computes MEDIUM buzz level", async () => {
      mockPrisma.discoverySignal.count
        .mockResolvedValueOnce(5) // 24h
        .mockResolvedValueOnce(10); // 7d

      mockPrisma.eventAttendance.count.mockResolvedValue(20);
      mockPrisma.socialProof.upsert.mockResolvedValue({});

      const proof = await computeSocialProof("EVENT", "event-3");

      // trendingScore = 5*3 + 10 = 25
      expect(proof.buzzLevel).toBe("MEDIUM");
    });

    it("computes HIGH buzz level", async () => {
      mockPrisma.discoverySignal.count
        .mockResolvedValueOnce(15) // 24h
        .mockResolvedValueOnce(15); // 7d

      mockPrisma.eventAttendance.count.mockResolvedValue(50);
      mockPrisma.socialProof.upsert.mockResolvedValue({});

      const proof = await computeSocialProof("EVENT", "event-4");

      // trendingScore = 15*3 + 15 = 60
      expect(proof.buzzLevel).toBe("HIGH");
    });

    it("returns 0 totalAttending for non-EVENT entities", async () => {
      mockPrisma.discoverySignal.count
        .mockResolvedValueOnce(10) // 24h
        .mockResolvedValueOnce(30); // 7d

      mockPrisma.socialProof.upsert.mockResolvedValue({});

      const proof = await computeSocialProof("COMEDIAN", "com-1");

      expect(proof.totalAttending).toBe(0);
    });

    it("upserts social proof to database", async () => {
      mockPrisma.discoverySignal.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      mockPrisma.eventAttendance.count.mockResolvedValue(0);
      mockPrisma.socialProof.upsert.mockResolvedValue({});

      await computeSocialProof("EVENT", "event-x");

      expect(mockPrisma.socialProof.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entityType_entityId: { entityType: "EVENT", entityId: "event-x" } },
        }),
      );
    });
  });

  /* ------------------------------------------------------------------------ */
  /*  getSocialProof                                                          */
  /* ------------------------------------------------------------------------ */

  describe("getSocialProof", () => {
    it("returns social proof with user-specific friend counts", async () => {
      mockPrisma.socialProof.findUnique.mockResolvedValue({
        entityType: "EVENT",
        entityId: "event-1",
        friendsAttending: 0,
        totalAttending: 100,
        trendingScore: 50,
        buzzLevel: "HIGH",
      });

      mockPrisma.userFollow.findMany.mockResolvedValue([
        { followingId: "friend-1" },
        { followingId: "friend-2" },
      ]);

      mockPrisma.eventAttendance.count.mockResolvedValue(2);

      const proof = await getSocialProof("EVENT", "event-1", "user-1");

      expect(proof!.friendsAttending).toBe(2);
      expect(proof!.totalAttending).toBe(100);
    });

    it("returns null when no social proof exists", async () => {
      mockPrisma.socialProof.findUnique.mockResolvedValue(null);

      const proof = await getSocialProof("EVENT", "event-unknown");

      expect(proof).toBeNull();
    });

    it("returns 0 friends when no userId provided", async () => {
      mockPrisma.socialProof.findUnique.mockResolvedValue({
        entityType: "EVENT",
        entityId: "event-1",
        friendsAttending: 0,
        totalAttending: 100,
        trendingScore: 50,
        buzzLevel: "HIGH",
      });

      const proof = await getSocialProof("EVENT", "event-1");

      expect(proof!.friendsAttending).toBe(0);
    });
  });

  /* ------------------------------------------------------------------------ */
  /*  applyDiscoveryBoost                                                     */
  /* ------------------------------------------------------------------------ */

  describe("applyDiscoveryBoost", () => {
    it("creates boost with correct multiplier for NEW_COMEDIAN", async () => {
      mockPrisma.discoveryBoost.create.mockResolvedValue({
        id: "boost-1",
        entityType: "COMEDIAN",
        entityId: "com-1",
        boostType: "NEW_COMEDIAN",
        boostMultiplier: 1.5,
        expiresAt: expect.any(Date),
      });

      const result = await applyDiscoveryBoost("COMEDIAN", "com-1", "NEW_COMEDIAN", 24);

      expect(mockPrisma.discoveryBoost.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          boostType: "NEW_COMEDIAN",
          boostMultiplier: 1.5,
        }),
      });
    });

    it("creates boost with correct multiplier for EDITORIAL_PICK", async () => {
      mockPrisma.discoveryBoost.create.mockResolvedValue({
        id: "boost-2",
        entityType: "EVENT",
        entityId: "event-1",
        boostType: "EDITORIAL_PICK",
        boostMultiplier: 2.5,
        expiresAt: expect.any(Date),
      });

      await applyDiscoveryBoost("EVENT", "event-1", "EDITORIAL_PICK", 48);

      expect(mockPrisma.discoveryBoost.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          boostMultiplier: 2.5,
        }),
      });
    });

    it("sets expiration based on duration hours", async () => {
      const beforeCall = Date.now();
      mockPrisma.discoveryBoost.create.mockImplementation(({ data }: { data: { expiresAt: Date } }) => {
        return Promise.resolve({ id: "boost-3", ...data });
      });

      await applyDiscoveryBoost("EVENT", "event-1", "TRENDING", 12);

      const callData = mockPrisma.discoveryBoost.create.mock.calls[0][0].data;
      const expiresAt = callData.expiresAt.getTime();
      const expectedExpiry = beforeCall + 12 * 60 * 60 * 1000;

      // Allow 1 second tolerance
      expect(Math.abs(expiresAt - expectedExpiry)).toBeLessThan(1000);
    });
  });

  /* ------------------------------------------------------------------------ */
  /*  getActiveBoosts                                                         */
  /* ------------------------------------------------------------------------ */

  describe("getActiveBoosts", () => {
    it("returns only non-expired boosts", async () => {
      const futureDate = new Date(Date.now() + 3600000);
      mockPrisma.discoveryBoost.findMany.mockResolvedValue([
        { id: "boost-1", entityType: "EVENT", entityId: "e1", boostType: "TRENDING", boostMultiplier: 1.6, expiresAt: futureDate },
      ]);

      const boosts = await getActiveBoosts();

      expect(boosts.length).toBe(1);
      expect(mockPrisma.discoveryBoost.findMany).toHaveBeenCalledWith({
        where: { expiresAt: { gt: expect.any(Date) } },
        orderBy: { expiresAt: "asc" },
      });
    });

    it("returns empty array when no active boosts", async () => {
      mockPrisma.discoveryBoost.findMany.mockResolvedValue([]);

      const boosts = await getActiveBoosts();

      expect(boosts).toEqual([]);
    });
  });

  /* ------------------------------------------------------------------------ */
  /*  scoreFeedItem                                                           */
  /* ------------------------------------------------------------------------ */

  describe("scoreFeedItem", () => {
    const baseItem: FeedItem = {
      entityType: "EVENT",
      entityId: "event-1",
      score: 0,
      title: "Test Event",
    };

    const baseProfile: DiscoveryProfile = {
      userId: "user-1",
      preferredGenres: ["dark", "observational"],
      preferredVenues: [],
      preferredDays: [],
      averageSpend: 0,
      discoveryOpenness: 0.5,
      lastComputedAt: new Date(),
    };

    it("scores higher for genre match", () => {
      const score = scoreFeedItem(
        baseItem,
        baseProfile,
        null,
        ["dark"],
        [],
      );

      const noMatchScore = scoreFeedItem(
        baseItem,
        baseProfile,
        null,
        ["improv"],
        [],
      );

      expect(score).toBeGreaterThan(noMatchScore);
    });

    it("incorporates social proof into score", () => {
      const withSocial = scoreFeedItem(
        baseItem,
        baseProfile,
        { entityType: "EVENT", entityId: "event-1", friendsAttending: 5, totalAttending: 100, trendingScore: 50, buzzLevel: "HIGH" },
        ["dark"],
        [],
      );

      const withoutSocial = scoreFeedItem(
        baseItem,
        baseProfile,
        null,
        ["dark"],
        [],
      );

      expect(withSocial).toBeGreaterThan(withoutSocial);
    });

    it("applies boost multiplier to score", () => {
      const withBoost = scoreFeedItem(
        baseItem,
        baseProfile,
        null,
        ["dark"],
        [{ boostMultiplier: 2.0 }],
      );

      const withoutBoost = scoreFeedItem(
        baseItem,
        baseProfile,
        null,
        ["dark"],
        [],
      );

      expect(withBoost).toBeGreaterThan(withoutBoost);
    });

    it("clamps score between 0 and 100", () => {
      const extremeScore = scoreFeedItem(
        baseItem,
        baseProfile,
        { entityType: "EVENT", entityId: "event-1", friendsAttending: 1000, totalAttending: 10000, trendingScore: 1000, buzzLevel: "VIRAL" },
        ["dark", "observational"],
        [{ boostMultiplier: 10 }],
      );

      expect(extremeScore).toBeLessThanOrEqual(100);
      expect(extremeScore).toBeGreaterThanOrEqual(0);
    });

    it("gives neutral taste score when no genres specified", () => {
      const score = scoreFeedItem(
        baseItem,
        baseProfile,
        null,
        [],
        [],
      );

      // Should get 30% of taste weight for unknown genres
      expect(score).toBeGreaterThan(0);
    });
  });

  /* ------------------------------------------------------------------------ */
  /*  computeBuzzLevel                                                        */
  /* ------------------------------------------------------------------------ */

  describe("computeBuzzLevel", () => {
    it("returns LOW for minimal signals", () => {
      expect(computeBuzzLevel(0, 0)).toBe("LOW");
      expect(computeBuzzLevel(1, 2)).toBe("LOW");
    });

    it("returns MEDIUM for moderate signals", () => {
      // 5*3 + 10 = 25 >= 20
      expect(computeBuzzLevel(5, 10)).toBe("MEDIUM");
    });

    it("returns HIGH for high signals", () => {
      // 15*3 + 15 = 60 >= 50
      expect(computeBuzzLevel(15, 15)).toBe("HIGH");
    });

    it("returns VIRAL for extreme signals", () => {
      // 30*3 + 20 = 110 >= 100
      expect(computeBuzzLevel(30, 20)).toBe("VIRAL");
    });

    it("weights 24h signals 3x more than 7d signals", () => {
      // 10*3 + 0 = 30 (MEDIUM)
      expect(computeBuzzLevel(10, 0)).toBe("MEDIUM");
      // 0*3 + 30 = 30 (MEDIUM) - same result needs more 7d signals
      expect(computeBuzzLevel(0, 30)).toBe("MEDIUM");
    });
  });

  /* ------------------------------------------------------------------------ */
  /*  getDiscoveryInsights                                                    */
  /* ------------------------------------------------------------------------ */

  describe("getDiscoveryInsights", () => {
    it("returns comedian-based insights when user has favorite comedians", async () => {
      mockPrisma.userDiscoveryProfile.findUnique.mockResolvedValue({
        userId: "user-1",
        preferredGenres: ["dark"],
        preferredVenues: [],
        preferredDays: [],
        averageSpend: 0,
        discoveryOpenness: 0.5,
        lastComputedAt: new Date(),
      });

      mockPrisma.discoverySignal.findMany.mockResolvedValue([
        { entityType: "COMEDIAN", entityId: "com-1", signalType: "ATTEND", weight: 5, createdAt: new Date() },
        { entityType: "COMEDIAN", entityId: "com-1", signalType: "ATTEND", weight: 5, createdAt: new Date() },
        { entityType: "COMEDIAN", entityId: "com-1", signalType: "ATTEND", weight: 5, createdAt: new Date() },
      ]);

      mockPrisma.comedian.findMany.mockResolvedValue([
        { id: "com-1", name: "Dave Chappelle" },
      ]);

      mockPrisma.event.findMany.mockResolvedValue([
        {
          id: "event-1",
          comedians: [
            { comedian: { id: "com-1", genres: [{ genre: "dark" }] } },
          ],
        },
      ]);

      const insights = await getDiscoveryInsights("user-1");

      expect(insights[0].reason).toContain("Dave Chappelle");
      expect(insights[0].reason).toContain("3 times");
    });

    it("returns genre-based insights when no comedian match", async () => {
      mockPrisma.userDiscoveryProfile.findUnique.mockResolvedValue({
        userId: "user-1",
        preferredGenres: ["observational"],
        preferredVenues: [],
        preferredDays: [],
        averageSpend: 0,
        discoveryOpenness: 0.5,
        lastComputedAt: new Date(),
      });

      mockPrisma.discoverySignal.findMany.mockResolvedValue([
        { entityType: "EVENT", entityId: "e1", signalType: "VIEW", weight: 1, createdAt: new Date() },
      ]);

      mockPrisma.comedian.findMany.mockResolvedValue([]);

      mockPrisma.event.findMany.mockResolvedValue([
        {
          id: "event-1",
          comedians: [
            { comedian: { id: "com-new", genres: [{ genre: "observational" }] } },
          ],
        },
      ]);

      const insights = await getDiscoveryInsights("user-1");

      expect(insights[0].reason).toContain("observational");
    });

    it("returns default insight for cold start users", async () => {
      mockPrisma.userDiscoveryProfile.findUnique.mockResolvedValue(null);

      const insights = await getDiscoveryInsights("new-user");

      expect(insights[0].reason).toBe("Popular in your area");
    });

    it("returns default insight when profile has no genres", async () => {
      mockPrisma.userDiscoveryProfile.findUnique.mockResolvedValue({
        userId: "user-1",
        preferredGenres: [],
        preferredVenues: [],
        preferredDays: [],
        averageSpend: 0,
        discoveryOpenness: 0.5,
        lastComputedAt: new Date(),
      });

      const insights = await getDiscoveryInsights("user-1");

      expect(insights[0].reason).toBe("Popular in your area");
    });
  });

  /* ------------------------------------------------------------------------ */
  /*  Cold Start                                                              */
  /* ------------------------------------------------------------------------ */

  describe("cold start", () => {
    it("generates For You feed for new user with no signals", async () => {
      mockPrisma.userDiscoveryProfile.findUnique.mockResolvedValue(null);

      const futureDate = new Date(Date.now() + 86400000);
      mockPrisma.event.findMany.mockResolvedValue([
        {
          id: "event-1",
          title: "Popular Show",
          date: futureDate,
          venue: { id: "v1", name: "Club A", latitude: null, longitude: null },
          comedians: [{ comedian: { id: "c1", genres: [{ genre: "standup" }] } }],
        },
      ]);

      mockPrisma.socialProof.findUnique.mockResolvedValue(null);
      mockPrisma.discoveryBoost.findMany.mockResolvedValue([]);

      const feed = await generateForYouFeed("new-user");

      expect(feed.length).toBe(1);
      // New users should still get some score (neutral taste + genre partial)
      expect(feed[0].score).toBeGreaterThan(0);
    });

    it("computes default profile for new user with no signals", async () => {
      mockPrisma.discoverySignal.findMany.mockResolvedValue([]);
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.userDiscoveryProfile.upsert.mockResolvedValue({});

      const profile = await computeDiscoveryProfile("new-user");

      expect(profile.preferredGenres).toEqual([]);
      expect(profile.preferredVenues).toEqual([]);
      expect(profile.preferredDays).toEqual([]);
      expect(profile.discoveryOpenness).toBe(0.5);
    });

    it("friends attending returns empty for user with no friends", async () => {
      mockPrisma.userFollow.findMany.mockResolvedValue([]);

      const feed = await generateFriendsAttendingFeed("lonely-user");

      expect(feed).toEqual([]);
    });
  });
});
