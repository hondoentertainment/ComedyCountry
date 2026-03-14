import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildUserExport } from "./user-export";

vi.mock("./prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> };
};

const makeUser = (overrides = {}) => ({
  id: "user-1",
  name: "Test User",
  profileName: "testuser",
  email: "test@example.com",
  image: null,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-06-01"),
  followsComedians: [
    {
      createdAt: new Date("2025-02-01"),
      comedian: {
        id: "c-1",
        name: "Bill Burr",
        slug: "bill-burr",
        headshotUrl: null,
        bio: "Stand-up comedian",
        website: null,
        touringStatus: "TOURING",
      },
    },
  ],
  followsVenues: [
    {
      createdAt: new Date("2025-03-01"),
      venue: {
        id: "v-1",
        name: "Comedy Cellar",
        address: "117 MacDougal St",
        city: "New York",
        state: "NY",
        type: "CLUB",
        website: "https://comedycellar.com",
      },
    },
  ],
  eventReviews: [
    {
      rating: 5,
      comment: "Amazing show!",
      createdAt: new Date("2025-04-01"),
      event: {
        id: "e-1",
        date: new Date("2025-03-28"),
        showtime: "8:00 PM",
        title: "Friday Night Standup",
        venue: { name: "Comedy Cellar", city: "New York", state: "NY" },
      },
    },
  ],
  comedianTierRatings: [
    {
      tier: "S",
      createdAt: new Date("2025-05-01"),
      comedian: { id: "c-1", name: "Bill Burr", slug: "bill-burr" },
    },
  ],
  ...overrides,
});

describe("user-export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildUserExport", () => {
    it("returns full user export with all data", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());

      const result = await buildUserExport("user-1");

      expect(result).not.toBeNull();
      expect(result!.user.id).toBe("user-1");
      expect(result!.user.email).toBe("test@example.com");
      expect(result!.exportedAt).toBeDefined();
    });

    it("includes followed comedians with follow dates", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());

      const result = await buildUserExport("user-1");

      expect(result!.favoriteComedians).toHaveLength(1);
      expect(result!.favoriteComedians[0].name).toBe("Bill Burr");
      expect(result!.favoriteComedians[0].followedAt).toBe(
        new Date("2025-02-01").toISOString()
      );
    });

    it("includes saved venues with follow dates", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());

      const result = await buildUserExport("user-1");

      expect(result!.savedVenues).toHaveLength(1);
      expect(result!.savedVenues[0].name).toBe("Comedy Cellar");
      expect(result!.savedVenues[0].city).toBe("New York");
    });

    it("includes event reviews", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());

      const result = await buildUserExport("user-1");

      expect(result!.eventReviews).toHaveLength(1);
      expect(result!.eventReviews[0].rating).toBe(5);
      expect(result!.eventReviews[0].comment).toBe("Amazing show!");
    });

    it("includes comedian tier ratings", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());

      const result = await buildUserExport("user-1");

      expect(result!.comedianTierRatings).toHaveLength(1);
      expect(result!.comedianTierRatings[0].tier).toBe("S");
      expect(result!.comedianTierRatings[0].comedian.name).toBe("Bill Burr");
    });

    it("returns null when user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await buildUserExport("nonexistent");

      expect(result).toBeNull();
    });

    it("handles user with no activity", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(
        makeUser({
          followsComedians: [],
          followsVenues: [],
          eventReviews: [],
          comedianTierRatings: [],
        })
      );

      const result = await buildUserExport("user-1");

      expect(result!.favoriteComedians).toEqual([]);
      expect(result!.savedVenues).toEqual([]);
      expect(result!.eventReviews).toEqual([]);
      expect(result!.comedianTierRatings).toEqual([]);
    });

    it("serializes dates as ISO strings", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());

      const result = await buildUserExport("user-1");

      expect(result!.user.createdAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );
      expect(result!.eventReviews[0].createdAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );
    });
  });
});
