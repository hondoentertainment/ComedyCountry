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
    event: {
      groupBy: vi.fn(),
    },
    venueReview: {
      groupBy: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => Promise<unknown>) => fn,
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  venue: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  event: {
    groupBy: ReturnType<typeof vi.fn>;
  };
  venueReview: {
    groupBy: ReturnType<typeof vi.fn>;
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
      mockPrisma.event.groupBy.mockResolvedValue([]);
      mockPrisma.venueReview.groupBy.mockResolvedValue([]);

      const result = await listVenues();

      expect(result.venues).toHaveLength(1);
      expect(result.venues[0]).toMatchObject({
        id: "v1",
        name: "Comedy Club",
        state: "CA",
        upcomingEventCount: 0,
      });
      expect(result.total).toBe(1);
      expect(mockPrisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          take: 50,
          skip: 0,
        }),
      );
    });

    it("returns early without groupBy when no venues", async () => {
      mockPrisma.venue.findMany.mockResolvedValue([]);
      mockPrisma.venue.count.mockResolvedValue(0);

      const result = await listVenues();

      expect(result).toEqual({ venues: [], total: 0 });
      expect(mockPrisma.event.groupBy).not.toHaveBeenCalled();
    });

    it("merges upcomingEventCount from groupBy", async () => {
      const mockVenues = [
        { id: "v1", name: "Club A", state: "CA" },
        { id: "v2", name: "Club B", state: "NY" },
      ];
      mockPrisma.venue.findMany.mockResolvedValue(mockVenues);
      mockPrisma.venue.count.mockResolvedValue(2);
      mockPrisma.event.groupBy.mockResolvedValue([
        { venueId: "v1", _count: { id: 5 } },
        { venueId: "v2", _count: { id: 2 } },
      ]);
      mockPrisma.venueReview.groupBy.mockResolvedValue([]);

      const result = await listVenues();

      expect(result.venues[0]).toMatchObject({
        id: "v1",
        upcomingEventCount: 5,
      });
      expect(result.venues[1]).toMatchObject({
        id: "v2",
        upcomingEventCount: 2,
      });
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
        }),
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
        }),
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
        }),
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
        }),
      );
    });

    it("defaults to 500 take limit", async () => {
      mockPrisma.venue.findMany.mockResolvedValue([]);

      await listVenuesWithCoordinates();

      expect(mockPrisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 500 }),
      );
    });

    it("accepts custom take limit", async () => {
      mockPrisma.venue.findMany.mockResolvedValue([]);

      await listVenuesWithCoordinates({ take: 100 });

      expect(mockPrisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it("filters by state when provided", async () => {
      mockPrisma.venue.findMany.mockResolvedValue([]);

      await listVenuesWithCoordinates({ state: "CA" });

      expect(mockPrisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            state: { equals: "CA", mode: "insensitive" },
          }),
        }),
      );
    });

    it("filters by city when provided", async () => {
      mockPrisma.venue.findMany.mockResolvedValue([]);

      await listVenuesWithCoordinates({ city: "LA" });

      expect(mockPrisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            city: { contains: "LA", mode: "insensitive" },
          }),
        }),
      );
    });

    it("filters by search across name, city, and state", async () => {
      mockPrisma.venue.findMany.mockResolvedValue([]);

      await listVenuesWithCoordinates({ search: "comedy" });

      expect(mockPrisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: "comedy", mode: "insensitive" } },
              { city: { contains: "comedy", mode: "insensitive" } },
              { state: { contains: "comedy", mode: "insensitive" } },
            ],
          }),
        }),
      );
    });

    it("handles undefined options gracefully", async () => {
      mockPrisma.venue.findMany.mockResolvedValue([]);

      const result = await listVenuesWithCoordinates(undefined);

      expect(result).toEqual([]);
    });
  });

  describe("listVenues additional edge cases", () => {
    it("filters by type when provided", async () => {
      mockPrisma.venue.findMany.mockResolvedValue([]);
      mockPrisma.venue.count.mockResolvedValue(0);

      await listVenues({ type: "THEATER" as never });

      expect(mockPrisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: "THEATER" }),
        }),
      );
    });

    it("filters by capacity range", async () => {
      mockPrisma.venue.findMany.mockResolvedValue([]);
      mockPrisma.venue.count.mockResolvedValue(0);

      await listVenues({ capacityMin: 100, capacityMax: 500 });

      expect(mockPrisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            capacity: { gte: 100, lte: 500 },
          }),
        }),
      );
    });

    it("filters by capacityMin only", async () => {
      mockPrisma.venue.findMany.mockResolvedValue([]);
      mockPrisma.venue.count.mockResolvedValue(0);

      await listVenues({ capacityMin: 100 });

      expect(mockPrisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            capacity: { gte: 100 },
          }),
        }),
      );
    });

    it("filters by capacityMax only", async () => {
      mockPrisma.venue.findMany.mockResolvedValue([]);
      mockPrisma.venue.count.mockResolvedValue(0);

      await listVenues({ capacityMax: 500 });

      expect(mockPrisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            capacity: { lte: 500 },
          }),
        }),
      );
    });

    it("orders by state, city, then name", async () => {
      mockPrisma.venue.findMany.mockResolvedValue([]);
      mockPrisma.venue.count.mockResolvedValue(0);

      await listVenues();

      expect(mockPrisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ state: "asc" }, { city: "asc" }, { name: "asc" }],
        }),
      );
    });

    it("includes first photo sorted by sortOrder", async () => {
      mockPrisma.venue.findMany.mockResolvedValue([]);
      mockPrisma.venue.count.mockResolvedValue(0);

      await listVenues();

      expect(mockPrisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            photos: { orderBy: { sortOrder: "asc" }, take: 1 },
          },
        }),
      );
    });

    it("defaults upcomingEventCount to 0 when no events", async () => {
      mockPrisma.venue.findMany.mockResolvedValue([{ id: "v1", name: "Club" }]);
      mockPrisma.venue.count.mockResolvedValue(1);
      mockPrisma.event.groupBy.mockResolvedValue([]);
      mockPrisma.venueReview.groupBy.mockResolvedValue([]);

      const result = await listVenues();
      expect(result.venues[0]).toMatchObject({ upcomingEventCount: 0 });
    });
  });

  describe("getVenue additional cases", () => {
    it("includes social links in response", async () => {
      mockPrisma.venue.findUnique.mockResolvedValue(null);

      await getVenue("v1");

      expect(mockPrisma.venue.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            socialLinks: true,
            _count: { select: { events: true } },
          }),
        }),
      );
    });

    it("only includes future events", async () => {
      const before = new Date();
      mockPrisma.venue.findUnique.mockResolvedValue(null);

      await getVenue("v1");

      const call = mockPrisma.venue.findUnique.mock.calls[0][0] as {
        include: { events: { where: { date: { gte: Date } } } };
      };
      const dateFilter = call.include.events.where.date.gte;
      expect(dateFilter.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it("limits events to 10", async () => {
      mockPrisma.venue.findUnique.mockResolvedValue(null);

      await getVenue("v1");

      expect(mockPrisma.venue.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            events: expect.objectContaining({ take: 10 }),
          }),
        }),
      );
    });
  });
});
