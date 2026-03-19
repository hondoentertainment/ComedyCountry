import { describe, it, expect, vi, beforeEach } from "vitest";
import { listEvents, getEventById, getEventsForUser } from "./events";

vi.mock("./prisma", () => ({
  prisma: {
    event: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  event: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  user: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

describe("events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listEvents", () => {
    it("returns events and total with default params", async () => {
      const mockEvents = [
        {
          id: "e1",
          date: new Date(),
          venue: { name: "Comedy Club" },
          comedians: [],
        },
      ];
      mockPrisma.event.findMany.mockResolvedValue(mockEvents);
      mockPrisma.event.count.mockResolvedValue(1);

      const result = await listEvents();

      expect(result).toEqual({ events: mockEvents, total: 1 });
      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: expect.objectContaining({ gte: expect.any(Date) }),
          }),
          take: 50,
          skip: 0,
        })
      );
    });

    it("filters by venueId when provided", async () => {
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(0);

      await listEvents({ venueId: "venue-1" });

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ venueId: "venue-1" }),
        })
      );
    });

    it("filters by comedianId when provided", async () => {
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(0);

      await listEvents({ comedianId: "comedian-1" });

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            comedians: { some: { comedianId: "comedian-1" } },
          }),
        })
      );
    });

    it("respects take and skip", async () => {
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(100);

      await listEvents({ take: 10, skip: 20 });

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });
  });

  describe("getEventById", () => {
    it("returns event with venue and comedians", async () => {
      const mockEvent = {
        id: "e1",
        venue: { name: "Comedy Club" },
        comedians: [{ comedian: { name: "Dave" } }],
      };
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);

      const result = await getEventById("e1");

      expect(result).toEqual(mockEvent);
      expect(mockPrisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: "e1" },
        include: expect.objectContaining({
          venue: true,
          comedians: expect.any(Object),
        }),
      });
    });

    it("returns null when event not found", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      const result = await getEventById("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("getEventsForUser", () => {
    it("returns empty when user has no follows", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        followsComedians: [],
        followsVenues: [],
      });

      const result = await getEventsForUser("user-1");

      expect(result).toEqual({ events: [], total: 0 });
      expect(mockPrisma.event.findMany).not.toHaveBeenCalled();
    });

    it("returns empty when user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await getEventsForUser("nonexistent");

      expect(result).toEqual({ events: [], total: 0 });
    });

    it("queries events for followed comedians and venues", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        followsComedians: [{ comedianId: "c1" }],
        followsVenues: [{ venueId: "v1" }],
      });
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(0);

      await getEventsForUser("user-1");

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: expect.objectContaining({ gte: expect.any(Date) }),
            OR: expect.arrayContaining([
              { comedians: { some: { comedianId: { in: ["c1"] } } } },
              { venueId: { in: ["v1"] } },
            ]),
          }),
        })
      );
    });

    it("defaults take to 10", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        followsComedians: [{ comedianId: "c1" }],
        followsVenues: [],
      });
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(0);

      await getEventsForUser("user-1");

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      );
    });

    it("accepts custom take parameter", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        followsComedians: [{ comedianId: "c1" }],
        followsVenues: [],
      });
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(0);

      await getEventsForUser("user-1", 25);

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 25 })
      );
    });

    it("queries only comedian follows when no venue follows", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        followsComedians: [{ comedianId: "c1" }, { comedianId: "c2" }],
        followsVenues: [],
      });
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(0);

      await getEventsForUser("user-1");

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { comedians: { some: { comedianId: { in: ["c1", "c2"] } } } },
            ],
          }),
        })
      );
    });

    it("queries only venue follows when no comedian follows", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        followsComedians: [],
        followsVenues: [{ venueId: "v1" }],
      });
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(0);

      await getEventsForUser("user-1");

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ venueId: { in: ["v1"] } }],
          }),
        })
      );
    });
  });

  describe("listEvents additional edge cases", () => {
    it("filters by date range when both from and to provided", async () => {
      const from = new Date("2025-01-01");
      const to = new Date("2025-12-31");
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(0);

      await listEvents({ from, to });

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: { gte: from, lte: to },
          }),
        })
      );
    });

    it("filters by state and city via venue relation", async () => {
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(0);

      await listEvents({ city: "Nashville", state: "TN" });

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            venue: {
              city: { contains: "Nashville", mode: "insensitive" },
              state: { equals: "TN", mode: "insensitive" },
            },
          }),
        })
      );
    });

    it("orders events by ascending date", async () => {
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(0);

      await listEvents();

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { date: "asc" },
        })
      );
    });

    it("includes venue and comedian data", async () => {
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(0);

      await listEvents();

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            venue: true,
            comedians: { include: { comedian: true } },
          },
        })
      );
    });
  });

  describe("getEventById additional cases", () => {
    it("includes ticket types when option is set", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await getEventById("e1", { includeTicketTypes: true });

      expect(mockPrisma.event.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            ticketTypes: { select: { capacity: true, sold: true } },
          }),
        })
      );
    });

    it("excludes ticket types by default", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await getEventById("e1");

      const call = mockPrisma.event.findUnique.mock.calls[0][0] as {
        include: Record<string, unknown>;
      };
      expect(call.include).not.toHaveProperty("ticketTypes");
    });
  });
});
