import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  computeTasteProfile,
  getTasteProfile,
  getTasteMatchScore,
  getSmartRecommendations,
  getHappeningTonight,
} from "./taste-profile";

vi.mock("./prisma", () => ({
  prisma: {
    comedianFollow: { findMany: vi.fn() },
    eventReview: { findMany: vi.fn() },
    eventAttendance: { findMany: vi.fn() },
    comedianTierRating: { findMany: vi.fn() },
    tasteProfile: { upsert: vi.fn(), findUnique: vi.fn() },
    comedianGenre: { findMany: vi.fn() },
    comedian: { findMany: vi.fn() },
    event: { findMany: vi.fn() },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  comedianFollow: { findMany: ReturnType<typeof vi.fn> };
  eventReview: { findMany: ReturnType<typeof vi.fn> };
  eventAttendance: { findMany: ReturnType<typeof vi.fn> };
  comedianTierRating: { findMany: ReturnType<typeof vi.fn> };
  tasteProfile: {
    upsert: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  comedianGenre: { findMany: ReturnType<typeof vi.fn> };
  comedian: { findMany: ReturnType<typeof vi.fn> };
  event: { findMany: ReturnType<typeof vi.fn> };
};

describe("taste-profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("computeTasteProfile", () => {
    it("computes profile from follows, reviews, attendance, and tier ratings", async () => {
      // Follows: dark comedy
      mockPrisma.comedianFollow.findMany.mockResolvedValue([
        { comedian: { genres: [{ genre: "dark" }] } },
      ]);
      // Reviews: observational rated 5
      mockPrisma.eventReview.findMany.mockResolvedValue([
        {
          rating: 5,
          event: {
            comedians: [{ comedian: { genres: [{ genre: "observational" }] } }],
          },
        },
      ]);
      // Attendance: absurdist
      mockPrisma.eventAttendance.findMany.mockResolvedValue([
        {
          event: {
            comedians: [{ comedian: { genres: [{ genre: "absurdist" }] } }],
          },
        },
      ]);
      // Tier ratings: S-tier for dark
      mockPrisma.comedianTierRating.findMany.mockResolvedValue([
        { tier: "S", comedian: { genres: [{ genre: "dark" }] } },
      ]);

      const upsertResult = {
        id: "tp-1",
        userId: "user-1",
        confidence: 0.08,
        lastComputed: new Date(),
      };
      mockPrisma.tasteProfile.upsert.mockResolvedValue(upsertResult);

      const result = await computeTasteProfile("user-1");

      expect(result.userId).toBe("user-1");
      expect(result.dimensions).toHaveProperty("dark");
      expect(result.dimensions).toHaveProperty("observational");
      expect(result.dimensions).toHaveProperty("absurdist");
      // Dark should be highest (follow weight 2 + tier S weight 3 = 5)
      expect(result.dimensions.dark).toBe(1);
      expect(result.topGenres).toContain("dark");
      expect(result.confidence).toBeGreaterThan(0);
      expect(mockPrisma.tasteProfile.upsert).toHaveBeenCalled();
    });

    it("handles user with no signals", async () => {
      mockPrisma.comedianFollow.findMany.mockResolvedValue([]);
      mockPrisma.eventReview.findMany.mockResolvedValue([]);
      mockPrisma.eventAttendance.findMany.mockResolvedValue([]);
      mockPrisma.comedianTierRating.findMany.mockResolvedValue([]);

      const upsertResult = {
        id: "tp-2",
        userId: "user-2",
        confidence: 0,
        lastComputed: new Date(),
      };
      mockPrisma.tasteProfile.upsert.mockResolvedValue(upsertResult);

      const result = await computeTasteProfile("user-2");

      expect(result.dimensions).toEqual({});
      expect(result.topGenres).toEqual([]);
      expect(result.confidence).toBe(0);
    });

    it("caps topGenres at 5", async () => {
      const genres = [
        "dark",
        "observational",
        "absurdist",
        "physical",
        "clean",
        "political",
        "surreal",
      ];
      mockPrisma.comedianFollow.findMany.mockResolvedValue(
        genres.map((g) => ({ comedian: { genres: [{ genre: g }] } }))
      );
      mockPrisma.eventReview.findMany.mockResolvedValue([]);
      mockPrisma.eventAttendance.findMany.mockResolvedValue([]);
      mockPrisma.comedianTierRating.findMany.mockResolvedValue([]);
      mockPrisma.tasteProfile.upsert.mockResolvedValue({
        id: "tp-3",
        userId: "user-3",
        confidence: 0.14,
        lastComputed: new Date(),
      });

      const result = await computeTasteProfile("user-3");

      expect(result.topGenres.length).toBeLessThanOrEqual(5);
    });
  });

  describe("getTasteProfile", () => {
    it("returns parsed profile when found", async () => {
      mockPrisma.tasteProfile.findUnique.mockResolvedValue({
        id: "tp-1",
        userId: "user-1",
        dimensions: JSON.stringify({ dark: 0.9, observational: 0.5 }),
        topGenres: JSON.stringify(["dark", "observational"]),
        confidence: 0.75,
        lastComputed: new Date("2026-01-01"),
      });

      const result = await getTasteProfile("user-1");

      expect(result).not.toBeNull();
      expect(result!.dimensions.dark).toBe(0.9);
      expect(result!.topGenres).toEqual(["dark", "observational"]);
    });

    it("returns null when no profile exists", async () => {
      mockPrisma.tasteProfile.findUnique.mockResolvedValue(null);

      const result = await getTasteProfile("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("getTasteMatchScore", () => {
    it("returns match percentage for overlapping genres", async () => {
      mockPrisma.tasteProfile.findUnique.mockResolvedValue({
        id: "tp-1",
        userId: "user-1",
        dimensions: JSON.stringify({ dark: 0.9, observational: 0.6 }),
        topGenres: JSON.stringify(["dark", "observational"]),
        confidence: 0.8,
        lastComputed: new Date(),
      });
      mockPrisma.comedianGenre.findMany.mockResolvedValue([
        { genre: "dark" },
        { genre: "physical" },
      ]);

      const result = await getTasteMatchScore("user-1", "comedian-1");

      expect(result.matchPct).toBeGreaterThan(0);
      expect(result.matchPct).toBeLessThanOrEqual(100);
      expect(result.matchingGenres).toContain("dark");
      expect(result.matchingGenres).not.toContain("physical");
    });

    it("returns 0 when no profile exists", async () => {
      mockPrisma.tasteProfile.findUnique.mockResolvedValue(null);

      const result = await getTasteMatchScore("user-1", "comedian-1");

      expect(result.matchPct).toBe(0);
      expect(result.matchingGenres).toEqual([]);
    });

    it("returns 0 when comedian has no genres", async () => {
      mockPrisma.tasteProfile.findUnique.mockResolvedValue({
        id: "tp-1",
        userId: "user-1",
        dimensions: JSON.stringify({ dark: 0.9 }),
        topGenres: JSON.stringify(["dark"]),
        confidence: 0.8,
        lastComputed: new Date(),
      });
      mockPrisma.comedianGenre.findMany.mockResolvedValue([]);

      const result = await getTasteMatchScore("user-1", "comedian-1");

      expect(result.matchPct).toBe(0);
    });
  });

  describe("getSmartRecommendations", () => {
    it("returns popular comedians for cold-start users", async () => {
      // No taste profile
      mockPrisma.tasteProfile.findUnique.mockResolvedValue(null);
      // No signals for compute
      mockPrisma.comedianFollow.findMany.mockResolvedValue([]);
      mockPrisma.eventReview.findMany.mockResolvedValue([]);
      mockPrisma.eventAttendance.findMany.mockResolvedValue([]);
      mockPrisma.comedianTierRating.findMany.mockResolvedValue([]);
      mockPrisma.tasteProfile.upsert.mockResolvedValue({
        id: "tp-cold",
        userId: "user-cold",
        confidence: 0,
        lastComputed: new Date(),
      });
      // Popular comedians fallback
      mockPrisma.comedian.findMany.mockResolvedValue([
        {
          id: "c1",
          name: "Popular Comic",
          slug: "popular-comic",
          headshotUrl: null,
          genres: [{ genre: "observational" }],
          _count: { followers: 100 },
        },
      ]);

      const result = await getSmartRecommendations("user-cold", 5);

      expect(result.length).toBe(1);
      expect(result[0].reason).toBe("Popular on Punchline Atlas");
    });

    it("returns genre-matched recommendations for users with taste data", async () => {
      mockPrisma.tasteProfile.findUnique.mockResolvedValue({
        id: "tp-1",
        userId: "user-1",
        dimensions: JSON.stringify({ dark: 0.9, observational: 0.5 }),
        topGenres: JSON.stringify(["dark", "observational"]),
        confidence: 0.8,
        lastComputed: new Date(),
      });
      // Already followed
      mockPrisma.comedianFollow.findMany
        .mockResolvedValueOnce([{ comedianId: "followed-1" }])
        // Similar users
        .mockResolvedValueOnce([{ userId: "similar-user" }])
        // Collab follows
        .mockResolvedValueOnce([{ comedianId: "collab-rec" }]);
      // Genre candidates
      mockPrisma.comedian.findMany.mockResolvedValue([
        {
          id: "c2",
          name: "Dark Comic",
          slug: "dark-comic",
          headshotUrl: null,
          genres: [{ genre: "dark" }],
          _count: { followers: 50 },
        },
      ]);

      const result = await getSmartRecommendations("user-1", 5);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].genres).toContain("dark");
    });
  });

  describe("getHappeningTonight", () => {
    it("returns today's events", async () => {
      const today = new Date();
      mockPrisma.event.findMany.mockResolvedValue([
        {
          id: "e1",
          title: "Tonight's Show",
          date: today,
          showtime: "8:00 PM",
          ticketUrl: "https://example.com",
          venue: {
            id: "v1",
            name: "Club",
            city: "NYC",
            state: "NY",
            latitude: 40.7,
            longitude: -74.0,
          },
          comedians: [
            {
              comedian: {
                id: "c1",
                name: "Comedian",
                slug: "comedian",
                headshotUrl: null,
              },
            },
          ],
          _count: { attendees: 25 },
          ticketTypes: [{ capacity: 100, sold: 50 }],
        },
      ]);

      const result = await getHappeningTonight();

      expect(result.length).toBe(1);
      expect(result[0].title).toBe("Tonight's Show");
      expect(result[0].ticketsAvailable).toBe(true);
      expect(result[0].attendeeCount).toBe(25);
    });

    it("filters by location radius", async () => {
      const today = new Date();
      mockPrisma.event.findMany.mockResolvedValue([
        {
          id: "e-near",
          title: "Near Show",
          date: today,
          showtime: "8:00 PM",
          ticketUrl: null,
          venue: {
            id: "v1",
            name: "Near Club",
            city: "NYC",
            state: "NY",
            latitude: 40.71,
            longitude: -74.01,
          },
          comedians: [],
          _count: { attendees: 0 },
          ticketTypes: [],
        },
        {
          id: "e-far",
          title: "Far Show",
          date: today,
          showtime: "9:00 PM",
          ticketUrl: null,
          venue: {
            id: "v2",
            name: "Far Club",
            city: "LA",
            state: "CA",
            latitude: 34.05,
            longitude: -118.24,
          },
          comedians: [],
          _count: { attendees: 0 },
          ticketTypes: [],
        },
      ]);

      // Search near NYC with 10 mile radius
      const result = await getHappeningTonight(
        undefined,
        40.7128,
        -74.006,
        10
      );

      expect(result.length).toBe(1);
      expect(result[0].id).toBe("e-near");
    });

    it("marks sold-out events", async () => {
      const today = new Date();
      mockPrisma.event.findMany.mockResolvedValue([
        {
          id: "e-sold-out",
          title: "Sold Out",
          date: today,
          showtime: "8:00 PM",
          ticketUrl: null,
          venue: {
            id: "v1",
            name: "Club",
            city: "NYC",
            state: "NY",
            latitude: null,
            longitude: null,
          },
          comedians: [],
          _count: { attendees: 100 },
          ticketTypes: [{ capacity: 100, sold: 100 }],
        },
      ]);

      const result = await getHappeningTonight();

      expect(result[0].ticketsAvailable).toBe(false);
    });
  });
});
