import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  extractAccessibilityTypes,
  calculateAccessibilityScore,
  findASLShows,
  findCaptionedShows,
  findSensoryFriendlyEvents,
  discoverAccessibleShows,
  getVenueAccessibilitySummary,
  rankVenuesByAccessibility,
  getAccessibilityFeatureCoverage,
} from "./accessibility-discovery";

vi.mock("./prisma", () => ({
  prisma: {
    event: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    venue: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    accessibilityTag: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  event: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  venue: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  accessibilityTag: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

const mockEvent = {
  id: "e1",
  title: "Accessible Comedy Night",
  date: new Date("2026-05-01"),
  showtime: "7:30 PM",
  venue: { id: "v1", name: "Inclusive Club", city: "Portland", state: "OR" },
  accessibilityTags: [
    { id: "t1", type: "asl_interpreted", description: "ASL interpreter provided", verifiedBy: "admin1", verifiedAt: new Date() },
    { id: "t2", type: "captioned", description: "Live captions on screen", verifiedBy: null, verifiedAt: null },
  ],
  comedians: [{ comedian: { name: "Jane Smith", slug: "jane-smith" } }],
};

describe("accessibility-discovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("extractAccessibilityTypes", () => {
    it("extracts ASL interpreted type", () => {
      const types = extractAccessibilityTypes({ aslInterpreted: true });
      expect(types).toEqual(["asl_interpreted"]);
    });

    it("extracts multiple types", () => {
      const types = extractAccessibilityTypes({
        aslInterpreted: true,
        captioned: true,
        wheelchairAccessible: true,
      });
      expect(types).toContain("asl_interpreted");
      expect(types).toContain("captioned");
      expect(types).toContain("wheelchair");
      expect(types).toHaveLength(3);
    });

    it("returns empty array when no filters set", () => {
      const types = extractAccessibilityTypes({});
      expect(types).toEqual([]);
    });

    it("ignores non-boolean filter fields", () => {
      const types = extractAccessibilityTypes({ city: "Portland", state: "OR" });
      expect(types).toEqual([]);
    });

    it("extracts all accessibility types", () => {
      const types = extractAccessibilityTypes({
        aslInterpreted: true,
        captioned: true,
        sensoryFriendly: true,
        audioDescribed: true,
        wheelchairAccessible: true,
        hearingLoop: true,
        largePrint: true,
        serviceAnimal: true,
      });
      expect(types).toHaveLength(8);
    });
  });

  describe("calculateAccessibilityScore", () => {
    it("returns zero for no tags", () => {
      const score = calculateAccessibilityScore([]);
      expect(score.total).toBe(0);
      expect(score.featureCount).toBe(0);
      expect(score.verifiedCount).toBe(0);
    });

    it("calculates score based on feature count", () => {
      const tags = [
        { type: "wheelchair", verifiedBy: null },
        { type: "captioned", verifiedBy: null },
      ];
      const score = calculateAccessibilityScore(tags);

      expect(score.featureCount).toBe(2);
      expect(score.featureScore).toBe(Math.round((2 / 8) * 70)); // 18
      expect(score.verificationBonus).toBe(0);
      expect(score.total).toBe(score.featureScore);
    });

    it("adds verification bonus for verified tags", () => {
      const tags = [
        { type: "wheelchair", verifiedBy: "admin1" },
        { type: "captioned", verifiedBy: "admin1" },
      ];
      const score = calculateAccessibilityScore(tags);

      expect(score.verifiedCount).toBe(2);
      expect(score.verificationBonus).toBe(30); // all verified
      expect(score.total).toBe(score.featureScore + 30);
    });

    it("gives partial verification bonus", () => {
      const tags = [
        { type: "wheelchair", verifiedBy: "admin1" },
        { type: "captioned", verifiedBy: null },
      ];
      const score = calculateAccessibilityScore(tags);

      expect(score.verifiedCount).toBe(1);
      expect(score.verificationBonus).toBe(15); // 1/2 verified * 30
    });

    it("deduplicates feature types", () => {
      const tags = [
        { type: "wheelchair", verifiedBy: null },
        { type: "wheelchair", verifiedBy: "admin1" },
      ];
      const score = calculateAccessibilityScore(tags);

      expect(score.featureCount).toBe(1); // only unique types count
      expect(score.features).toEqual(["wheelchair"]);
    });

    it("returns list of features", () => {
      const tags = [
        { type: "asl_interpreted", verifiedBy: null },
        { type: "sensory_friendly", verifiedBy: null },
      ];
      const score = calculateAccessibilityScore(tags);

      expect(score.features).toContain("asl_interpreted");
      expect(score.features).toContain("sensory_friendly");
    });

    it("reaches max score with all features verified", () => {
      const tags = [
        { type: "asl_interpreted", verifiedBy: "a" },
        { type: "captioned", verifiedBy: "a" },
        { type: "audio_described", verifiedBy: "a" },
        { type: "sensory_friendly", verifiedBy: "a" },
        { type: "wheelchair", verifiedBy: "a" },
        { type: "hearing_loop", verifiedBy: "a" },
        { type: "large_print", verifiedBy: "a" },
        { type: "service_animal", verifiedBy: "a" },
      ];
      const score = calculateAccessibilityScore(tags);

      expect(score.total).toBe(100); // 70 + 30
    });
  });

  describe("findASLShows", () => {
    it("returns events with ASL interpretation", async () => {
      mockPrisma.event.findMany.mockResolvedValue([mockEvent]);
      mockPrisma.event.count.mockResolvedValue(1);

      const result = await findASLShows();

      expect(result.events).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.events[0].accessibilityScore).toBeGreaterThan(0);
    });

    it("filters by city", async () => {
      mockPrisma.event.findMany.mockResolvedValue([mockEvent]);
      mockPrisma.event.count.mockResolvedValue(1);

      await findASLShows({ city: "Portland" });

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            venue: expect.objectContaining({ city: "Portland" }),
          }),
        }),
      );
    });

    it("filters by date range", async () => {
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(0);

      await findASLShows({
        dateFrom: new Date("2026-06-01"),
        dateTo: new Date("2026-06-30"),
      });

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: expect.objectContaining({
              gte: new Date("2026-06-01"),
              lte: new Date("2026-06-30"),
            }),
          }),
        }),
      );
    });

    it("supports pagination", async () => {
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(50);

      await findASLShows({ take: 10, skip: 20 });

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 20 }),
      );
    });
  });

  describe("findCaptionedShows", () => {
    it("returns events with captioning", async () => {
      mockPrisma.event.findMany.mockResolvedValue([mockEvent]);
      mockPrisma.event.count.mockResolvedValue(1);

      const result = await findCaptionedShows();

      expect(result.events).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("filters by state", async () => {
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(0);

      await findCaptionedShows({ state: "OR" });

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            venue: expect.objectContaining({ state: "OR" }),
          }),
        }),
      );
    });
  });

  describe("findSensoryFriendlyEvents", () => {
    it("returns sensory-friendly events", async () => {
      const sensoryEvent = {
        ...mockEvent,
        accessibilityTags: [
          { id: "t3", type: "sensory_friendly", verifiedBy: null },
        ],
      };
      mockPrisma.event.findMany.mockResolvedValue([sensoryEvent]);
      mockPrisma.event.count.mockResolvedValue(1);

      const result = await findSensoryFriendlyEvents();

      expect(result.events).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe("discoverAccessibleShows", () => {
    it("discovers shows with any accessibility feature", async () => {
      mockPrisma.event.findMany.mockResolvedValue([mockEvent]);
      mockPrisma.event.count.mockResolvedValue(1);

      const result = await discoverAccessibleShows({});

      expect(result.events).toHaveLength(1);
      expect(result.events[0].accessibilityScore).toBeGreaterThan(0);
    });

    it("filters by multiple accessibility types", async () => {
      mockPrisma.event.findMany.mockResolvedValue([mockEvent]);
      mockPrisma.event.count.mockResolvedValue(1);

      await discoverAccessibleShows({
        aslInterpreted: true,
        captioned: true,
      });

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: [
              { accessibilityTags: { some: { type: "asl_interpreted" } } },
              { accessibilityTags: { some: { type: "captioned" } } },
            ],
          }),
        }),
      );
    });

    it("filters by minimum accessibility score", async () => {
      const lowScoreEvent = {
        ...mockEvent,
        id: "e2",
        accessibilityTags: [{ type: "wheelchair", verifiedBy: null }],
      };
      const highScoreEvent = {
        ...mockEvent,
        id: "e1",
        accessibilityTags: [
          { type: "wheelchair", verifiedBy: "admin" },
          { type: "captioned", verifiedBy: "admin" },
          { type: "asl_interpreted", verifiedBy: "admin" },
          { type: "hearing_loop", verifiedBy: "admin" },
        ],
      };
      mockPrisma.event.findMany.mockResolvedValue([lowScoreEvent, highScoreEvent]);
      mockPrisma.event.count.mockResolvedValue(2);

      const result = await discoverAccessibleShows({ minScore: 50 });

      expect(result.events.length).toBe(1);
      expect(result.events[0].id).toBe("e1");
    });

    it("sorts by accessibility score descending", async () => {
      const events = [
        {
          ...mockEvent,
          id: "e1",
          date: new Date("2026-05-01"),
          accessibilityTags: [{ type: "wheelchair", verifiedBy: null }],
        },
        {
          ...mockEvent,
          id: "e2",
          date: new Date("2026-05-02"),
          accessibilityTags: [
            { type: "wheelchair", verifiedBy: "admin" },
            { type: "captioned", verifiedBy: "admin" },
            { type: "asl_interpreted", verifiedBy: "admin" },
          ],
        },
      ];
      mockPrisma.event.findMany.mockResolvedValue(events);
      mockPrisma.event.count.mockResolvedValue(2);

      const result = await discoverAccessibleShows({});

      expect(result.events[0].id).toBe("e2"); // higher score first
    });

    it("filters by location and date", async () => {
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(0);

      await discoverAccessibleShows({
        city: "Portland",
        state: "OR",
        dateFrom: new Date("2026-06-01"),
        dateTo: new Date("2026-06-30"),
      });

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            venue: { city: "Portland", state: "OR" },
            date: expect.objectContaining({
              gte: new Date("2026-06-01"),
              lte: new Date("2026-06-30"),
            }),
          }),
        }),
      );
    });
  });

  describe("getVenueAccessibilitySummary", () => {
    it("returns venue accessibility summary", async () => {
      const venue = {
        id: "v1",
        name: "Inclusive Club",
        city: "Portland",
        state: "OR",
        accessibilityTags: [
          { id: "t1", type: "wheelchair", verifiedBy: "admin" },
          { id: "t2", type: "hearing_loop", verifiedBy: null },
        ],
      };
      mockPrisma.venue.findUnique.mockResolvedValue(venue);
      mockPrisma.event.findMany.mockResolvedValue([{ id: "e1" }, { id: "e2" }]);

      const result = await getVenueAccessibilitySummary("v1");

      expect(result.venue.name).toBe("Inclusive Club");
      expect(result.score.featureCount).toBe(2);
      expect(result.tags).toHaveLength(2);
      expect(result.upcomingAccessibleEvents).toBe(2);
    });

    it("throws when venue not found", async () => {
      mockPrisma.venue.findUnique.mockResolvedValue(null);

      await expect(getVenueAccessibilitySummary("nonexistent")).rejects.toThrow(
        "Venue not found",
      );
    });
  });

  describe("rankVenuesByAccessibility", () => {
    it("ranks venues by accessibility score", async () => {
      const venues = [
        {
          id: "v1",
          name: "Low Access",
          city: "Chicago",
          state: "IL",
          accessibilityTags: [{ type: "wheelchair", verifiedBy: null }],
        },
        {
          id: "v2",
          name: "High Access",
          city: "Chicago",
          state: "IL",
          accessibilityTags: [
            { type: "wheelchair", verifiedBy: "admin" },
            { type: "captioned", verifiedBy: "admin" },
            { type: "asl_interpreted", verifiedBy: "admin" },
            { type: "hearing_loop", verifiedBy: "admin" },
          ],
        },
      ];
      mockPrisma.venue.findMany.mockResolvedValue(venues);

      const result = await rankVenuesByAccessibility();

      expect(result.venues[0].id).toBe("v2"); // Higher score first
      expect(result.venues[0].accessibilityScore.total).toBeGreaterThan(
        result.venues[1].accessibilityScore.total,
      );
    });

    it("filters by city", async () => {
      mockPrisma.venue.findMany.mockResolvedValue([]);

      await rankVenuesByAccessibility({ city: "Portland" });

      expect(mockPrisma.venue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ city: "Portland" }),
        }),
      );
    });

    it("supports pagination", async () => {
      const venues = Array.from({ length: 30 }, (_, i) => ({
        id: `v${i}`,
        name: `Venue ${i}`,
        accessibilityTags: [{ type: "wheelchair", verifiedBy: null }],
      }));
      mockPrisma.venue.findMany.mockResolvedValue(venues);

      const result = await rankVenuesByAccessibility({ take: 10, skip: 5 });

      expect(result.venues).toHaveLength(10);
      expect(result.total).toBe(30);
    });
  });

  describe("getAccessibilityFeatureCoverage", () => {
    it("returns coverage stats per feature type", async () => {
      mockPrisma.accessibilityTag.findMany.mockResolvedValue([
        { type: "wheelchair", eventId: "e1", venueId: null, verifiedBy: "admin" },
        { type: "wheelchair", eventId: null, venueId: "v1", verifiedBy: null },
        { type: "captioned", eventId: "e1", venueId: null, verifiedBy: null },
      ]);
      mockPrisma.event.count.mockResolvedValue(10);
      mockPrisma.venue.count.mockResolvedValue(5);

      const result = await getAccessibilityFeatureCoverage();

      expect(result.totalEvents).toBe(10);
      expect(result.totalVenues).toBe(5);
      expect(result.coverage.wheelchair.eventCount).toBe(1);
      expect(result.coverage.wheelchair.venueCount).toBe(1);
      expect(result.coverage.wheelchair.verifiedCount).toBe(1);
      expect(result.coverage.wheelchair.eventPercentage).toBe(10);
      expect(result.coverage.wheelchair.venuePercentage).toBe(20);
      expect(result.coverage.captioned.eventCount).toBe(1);
    });

    it("handles empty database", async () => {
      mockPrisma.accessibilityTag.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(0);
      mockPrisma.venue.count.mockResolvedValue(0);

      const result = await getAccessibilityFeatureCoverage();

      expect(result.totalEvents).toBe(0);
      expect(result.totalVenues).toBe(0);
      expect(result.coverage.wheelchair.eventCount).toBe(0);
      expect(result.coverage.wheelchair.eventPercentage).toBe(0);
    });
  });
});
