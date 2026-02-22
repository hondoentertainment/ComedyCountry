import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listVenues,
  getVenue,
  getVenueStates,
  listVenuesWithCoordinates,
} from "./venues";

vi.mock("./prisma", () => ({
  prisma: {
    venue: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => Promise<unknown>) => fn,
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as {
  venue: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

describe("venues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listVenues", () => {
    it("returns venues and total with default params", async () => {
      const mockVenues = [{ id: "v1", name: "Comedy Club", state: "CA" }];
      mockPrisma.venue.findMany.mockResolvedValue(mockVenues);
      mockPrisma.venue.count.mockResolvedValue(1);

      const result = await listVenues();

      expect(result).toEqual({ venues: mockVenues, total: 1 });
      expect(mockPrisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          take: 50,
          skip: 0,
        })
      );
    });

    it("filters by state when provided", async () => {
      mockPrisma.venue.findMany.mockResolvedValue([]);
      mockPrisma.venue.count.mockResolvedValue(0);

      await listVenues({ state: "CA" });

      expect(mockPrisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            state: { equals: "CA", mode: "insensitive" },
          }),
        })
      );
    });

    it("filters by city when provided", async () => {
      mockPrisma.venue.findMany.mockResolvedValue([]);
      mockPrisma.venue.count.mockResolvedValue(0);

      await listVenues({ city: "Los Angeles" });

      expect(mockPrisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            city: { contains: "Los Angeles", mode: "insensitive" },
          }),
        })
      );
    });

    it("filters by search when provided", async () => {
      mockPrisma.venue.findMany.mockResolvedValue([]);
      mockPrisma.venue.count.mockResolvedValue(0);

      await listVenues({ search: "comedy" });

      expect(mockPrisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: "comedy", mode: "insensitive" } },
              { city: { contains: "comedy", mode: "insensitive" } },
            ],
          }),
        })
      );
    });
  });

  describe("getVenue", () => {
    it("returns venue by id with includes", async () => {
      const mockVenue = {
        id: "v1",
        name: "Comedy Club",
        photos: [],
        events: [],
      };
      mockPrisma.venue.findUnique.mockResolvedValue(mockVenue);

      const result = await getVenue("v1");

      expect(result).toEqual(mockVenue);
      expect(mockPrisma.venue.findUnique).toHaveBeenCalledWith({
        where: { id: "v1" },
        include: expect.objectContaining({
          photos: expect.any(Object),
          events: expect.any(Object),
        }),
      });
    });

    it("returns null when venue not found", async () => {
      mockPrisma.venue.findUnique.mockResolvedValue(null);

      const result = await getVenue("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("getVenueStates", () => {
    it("returns distinct states", async () => {
      mockPrisma.venue.findMany.mockResolvedValue([
        { state: "CA" },
        { state: "NY" },
      ]);

      const result = await getVenueStates();

      expect(result).toEqual([{ state: "CA" }, { state: "NY" }]);
      expect(mockPrisma.venue.findMany).toHaveBeenCalledWith({
        select: { state: true },
        distinct: ["state"],
        orderBy: { state: "asc" },
      });
    });
  });

  describe("listVenuesWithCoordinates", () => {
    it("filters venues with lat/long", async () => {
      mockPrisma.venue.findMany.mockResolvedValue([]);

      await listVenuesWithCoordinates();

      expect(mockPrisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            latitude: { not: null },
            longitude: { not: null },
          },
        })
      );
    });
  });
});
