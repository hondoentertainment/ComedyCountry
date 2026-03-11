import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  addAccessibilityTag,
  getAccessibilityTags,
  removeAccessibilityTag,
  verifyAccessibilityTag,
  searchAccessibleEvents,
  searchAccessibleVenues,
  getAccessibilityStats,
  ACCESSIBILITY_TYPES,
} from "./accessibility";

vi.mock("./prisma", () => ({
  prisma: {
    accessibilityTag: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    event: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    venue: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  accessibilityTag: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  event: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  venue: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

describe("accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("addAccessibilityTag", () => {
    it("creates a tag for an event", async () => {
      const tag = { id: "tag1", eventId: "e1", venueId: null, type: "wheelchair", description: "Ramp access" };
      mockPrisma.accessibilityTag.create.mockResolvedValue(tag);

      const result = await addAccessibilityTag({
        eventId: "e1",
        type: "wheelchair",
        description: "Ramp access",
      });

      expect(result).toEqual(tag);
      expect(mockPrisma.accessibilityTag.create).toHaveBeenCalledWith({
        data: {
          eventId: "e1",
          venueId: null,
          type: "wheelchair",
          description: "Ramp access",
        },
      });
    });

    it("creates a tag for a venue", async () => {
      const tag = { id: "tag2", eventId: null, venueId: "v1", type: "hearing_loop", description: null };
      mockPrisma.accessibilityTag.create.mockResolvedValue(tag);

      const result = await addAccessibilityTag({
        venueId: "v1",
        type: "hearing_loop",
      });

      expect(result).toEqual(tag);
      expect(mockPrisma.accessibilityTag.create).toHaveBeenCalledWith({
        data: {
          eventId: null,
          venueId: "v1",
          type: "hearing_loop",
          description: null,
        },
      });
    });

    it("throws when neither eventId nor venueId provided", async () => {
      await expect(
        addAccessibilityTag({ type: "wheelchair" }),
      ).rejects.toThrow("Either eventId or venueId is required");
    });

    it("throws for invalid accessibility type", async () => {
      await expect(
        addAccessibilityTag({ eventId: "e1", type: "invalid_type" }),
      ).rejects.toThrow("Invalid accessibility type: invalid_type");
    });

    it("accepts all valid accessibility types", async () => {
      for (const type of ACCESSIBILITY_TYPES) {
        mockPrisma.accessibilityTag.create.mockResolvedValue({
          id: `tag-${type}`,
          eventId: "e1",
          type,
        });

        const result = await addAccessibilityTag({ eventId: "e1", type });
        expect(result.type).toBe(type);
      }
    });

    it("creates tag without description", async () => {
      const tag = { id: "tag3", eventId: "e1", venueId: null, type: "captioned", description: null };
      mockPrisma.accessibilityTag.create.mockResolvedValue(tag);

      const result = await addAccessibilityTag({ eventId: "e1", type: "captioned" });
      expect(result.description).toBeNull();
    });
  });

  describe("getAccessibilityTags", () => {
    it("returns tags for an event", async () => {
      const tags = [
        { id: "t1", eventId: "e1", type: "wheelchair" },
        { id: "t2", eventId: "e1", type: "captioned" },
      ];
      mockPrisma.accessibilityTag.findMany.mockResolvedValue(tags);

      const result = await getAccessibilityTags("e1");

      expect(result).toEqual(tags);
      expect(mockPrisma.accessibilityTag.findMany).toHaveBeenCalledWith({
        where: { eventId: "e1" },
        orderBy: { createdAt: "desc" },
      });
    });

    it("returns tags for a venue", async () => {
      const tags = [{ id: "t3", venueId: "v1", type: "hearing_loop" }];
      mockPrisma.accessibilityTag.findMany.mockResolvedValue(tags);

      const result = await getAccessibilityTags(undefined, "v1");

      expect(result).toEqual(tags);
      expect(mockPrisma.accessibilityTag.findMany).toHaveBeenCalledWith({
        where: { venueId: "v1" },
        orderBy: { createdAt: "desc" },
      });
    });

    it("returns all tags when no filters given", async () => {
      mockPrisma.accessibilityTag.findMany.mockResolvedValue([]);

      const result = await getAccessibilityTags();

      expect(result).toEqual([]);
      expect(mockPrisma.accessibilityTag.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("removeAccessibilityTag", () => {
    it("removes an existing tag", async () => {
      const tag = { id: "t1", type: "wheelchair" };
      mockPrisma.accessibilityTag.findUnique.mockResolvedValue(tag);
      mockPrisma.accessibilityTag.delete.mockResolvedValue(tag);

      const result = await removeAccessibilityTag("t1");

      expect(result).toEqual(tag);
      expect(mockPrisma.accessibilityTag.delete).toHaveBeenCalledWith({
        where: { id: "t1" },
      });
    });

    it("throws when tag not found", async () => {
      mockPrisma.accessibilityTag.findUnique.mockResolvedValue(null);

      await expect(removeAccessibilityTag("nonexistent")).rejects.toThrow(
        "Accessibility tag not found",
      );
    });
  });

  describe("verifyAccessibilityTag", () => {
    it("marks tag as verified", async () => {
      const tag = { id: "t1", type: "wheelchair", verifiedBy: null };
      const updatedTag = { ...tag, verifiedBy: "u1", verifiedAt: new Date() };
      mockPrisma.accessibilityTag.findUnique.mockResolvedValue(tag);
      mockPrisma.accessibilityTag.update.mockResolvedValue(updatedTag);

      const result = await verifyAccessibilityTag("t1", "u1");

      expect(result.verifiedBy).toBe("u1");
      expect(mockPrisma.accessibilityTag.update).toHaveBeenCalledWith({
        where: { id: "t1" },
        data: {
          verifiedBy: "u1",
          verifiedAt: expect.any(Date),
        },
      });
    });

    it("throws when tag not found", async () => {
      mockPrisma.accessibilityTag.findUnique.mockResolvedValue(null);

      await expect(verifyAccessibilityTag("nonexistent", "u1")).rejects.toThrow(
        "Accessibility tag not found",
      );
    });

    it("allows re-verification by a different user", async () => {
      const tag = { id: "t1", verifiedBy: "u1", verifiedAt: new Date() };
      const updatedTag = { ...tag, verifiedBy: "u2", verifiedAt: new Date() };
      mockPrisma.accessibilityTag.findUnique.mockResolvedValue(tag);
      mockPrisma.accessibilityTag.update.mockResolvedValue(updatedTag);

      const result = await verifyAccessibilityTag("t1", "u2");

      expect(result.verifiedBy).toBe("u2");
    });
  });

  describe("searchAccessibleEvents", () => {
    it("searches events with specific accessibility types", async () => {
      const events = [
        { id: "e1", accessibilityTags: [{ type: "wheelchair" }], venue: { name: "Club A" } },
      ];
      mockPrisma.event.findMany.mockResolvedValue(events);
      mockPrisma.event.count.mockResolvedValue(1);

      const result = await searchAccessibleEvents({ types: ["wheelchair"] });

      expect(result.events).toEqual(events);
      expect(result.total).toBe(1);
    });

    it("searches events with location filters", async () => {
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(0);

      await searchAccessibleEvents({ city: "Chicago", state: "IL" });

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            venue: { city: "Chicago", state: "IL" },
          }),
        }),
      );
    });

    it("searches events with date range", async () => {
      const dateFrom = new Date("2026-01-01");
      const dateTo = new Date("2026-12-31");
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(0);

      await searchAccessibleEvents({ dateFrom, dateTo });

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: { gte: dateFrom, lte: dateTo },
          }),
        }),
      );
    });

    it("returns all accessible events when no type filter", async () => {
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(0);

      await searchAccessibleEvents({});

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accessibilityTags: { some: {} },
          }),
        }),
      );
    });

    it("supports pagination", async () => {
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(50);

      await searchAccessibleEvents({ take: 10, skip: 20 });

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 20 }),
      );
    });

    it("combines all filters together", async () => {
      const dateFrom = new Date("2026-06-01");
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(0);

      await searchAccessibleEvents({
        types: ["asl_interpreted", "captioned"],
        city: "New York",
        state: "NY",
        dateFrom,
      });

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accessibilityTags: { some: { type: { in: ["asl_interpreted", "captioned"] } } },
            venue: { city: "New York", state: "NY" },
            date: { gte: dateFrom },
          }),
        }),
      );
    });
  });

  describe("searchAccessibleVenues", () => {
    it("searches venues with specific accessibility types", async () => {
      const venues = [{ id: "v1", name: "Club A", accessibilityTags: [{ type: "wheelchair" }] }];
      mockPrisma.venue.findMany.mockResolvedValue(venues);
      mockPrisma.venue.count.mockResolvedValue(1);

      const result = await searchAccessibleVenues({ types: ["wheelchair"] });

      expect(result.venues).toEqual(venues);
      expect(result.total).toBe(1);
    });

    it("filters by location", async () => {
      mockPrisma.venue.findMany.mockResolvedValue([]);
      mockPrisma.venue.count.mockResolvedValue(0);

      await searchAccessibleVenues({ state: "CA" });

      expect(mockPrisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ state: "CA" }),
        }),
      );
    });

    it("supports pagination", async () => {
      mockPrisma.venue.findMany.mockResolvedValue([]);
      mockPrisma.venue.count.mockResolvedValue(30);

      const result = await searchAccessibleVenues({ take: 5, skip: 10 });

      expect(result.total).toBe(30);
      expect(mockPrisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5, skip: 10 }),
      );
    });
  });

  describe("getAccessibilityStats", () => {
    it("calculates platform-wide stats", async () => {
      const tags = [
        { type: "wheelchair", eventId: "e1", venueId: null, verifiedBy: "u1" },
        { type: "wheelchair", eventId: "e2", venueId: null, verifiedBy: null },
        { type: "captioned", eventId: "e1", venueId: null, verifiedBy: "u1" },
        { type: "wheelchair", eventId: null, venueId: "v1", verifiedBy: null },
        { type: "hearing_loop", eventId: null, venueId: "v1", verifiedBy: "u2" },
      ];
      mockPrisma.accessibilityTag.findMany.mockResolvedValue(tags);
      mockPrisma.event.count.mockResolvedValue(10);
      mockPrisma.venue.count.mockResolvedValue(5);

      const stats = await getAccessibilityStats();

      expect(stats.totalTags).toBe(5);
      expect(stats.eventsWithAccessibility).toBe(2); // e1, e2
      expect(stats.venuesWithAccessibility).toBe(1); // v1
      expect(stats.eventPercentage).toBe(20); // 2/10 * 100
      expect(stats.venuePercentage).toBe(20); // 1/5 * 100
      expect(stats.verifiedTags).toBe(3);
      expect(stats.byType.wheelchair.events).toBe(2);
      expect(stats.byType.wheelchair.venues).toBe(1);
      expect(stats.byType.captioned.events).toBe(1);
      expect(stats.byType.captioned.venues).toBe(0);
    });

    it("returns zero percentages when no events/venues", async () => {
      mockPrisma.accessibilityTag.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(0);
      mockPrisma.venue.count.mockResolvedValue(0);

      const stats = await getAccessibilityStats();

      expect(stats.totalTags).toBe(0);
      expect(stats.eventPercentage).toBe(0);
      expect(stats.venuePercentage).toBe(0);
      expect(stats.verifiedTags).toBe(0);
    });

    it("includes all accessibility types in breakdown", async () => {
      mockPrisma.accessibilityTag.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(0);
      mockPrisma.venue.count.mockResolvedValue(0);

      const stats = await getAccessibilityStats();

      for (const type of ACCESSIBILITY_TYPES) {
        expect(stats.byType[type]).toEqual({ events: 0, venues: 0 });
      }
    });
  });
});
