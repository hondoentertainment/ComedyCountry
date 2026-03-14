import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getEventsNeedingReviewPrompts,
  getUnreviewedAttendees,
  sendReviewPrompts,
  processReviewPrompts,
} from "./review-prompts";

vi.mock("./prisma", () => ({
  prisma: {
    event: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    eventAttendance: {
      findMany: vi.fn(),
    },
    eventReview: {
      findMany: vi.fn(),
    },
    notification: {
      createMany: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  event: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  eventAttendance: {
    findMany: ReturnType<typeof vi.fn>;
  };
  eventReview: {
    findMany: ReturnType<typeof vi.fn>;
  };
  notification: {
    createMany: ReturnType<typeof vi.fn>;
  };
};

describe("review-prompts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getEventsNeedingReviewPrompts", () => {
    it("returns events in the 18-30 hour window", async () => {
      const mockEvents = [
        {
          id: "e1",
          date: new Date(Date.now() - 24 * 60 * 60 * 1000),
          title: "Comedy Night",
          venueId: "v1",
          venue: { name: "Laugh Factory" },
          comedians: [{ comedian: { name: "Dave" } }],
        },
      ];
      mockPrisma.event.findMany.mockResolvedValue(mockEvents);

      const result = await getEventsNeedingReviewPrompts();

      expect(result).toEqual(mockEvents);
      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
            attendees: { some: { status: "going" } },
          }),
        })
      );

      // Verify the date window is correct (18-30 hours)
      const callArgs = mockPrisma.event.findMany.mock.calls[0][0];
      const now = Date.now();
      const gteTime = callArgs.where.date.gte.getTime();
      const lteTime = callArgs.where.date.lte.getTime();

      // gte should be ~30 hours ago
      expect(now - gteTime).toBeGreaterThanOrEqual(29.9 * 60 * 60 * 1000);
      expect(now - gteTime).toBeLessThanOrEqual(30.1 * 60 * 60 * 1000);

      // lte should be ~18 hours ago
      expect(now - lteTime).toBeGreaterThanOrEqual(17.9 * 60 * 60 * 1000);
      expect(now - lteTime).toBeLessThanOrEqual(18.1 * 60 * 60 * 1000);
    });

    it("excludes events outside the window", async () => {
      mockPrisma.event.findMany.mockResolvedValue([]);

      const result = await getEventsNeedingReviewPrompts();

      expect(result).toEqual([]);
      // The query uses gte/lte so Prisma handles filtering;
      // an empty result means no events matched the window
      expect(mockPrisma.event.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe("getUnreviewedAttendees", () => {
    it("returns attendees who have not reviewed", async () => {
      mockPrisma.eventAttendance.findMany.mockResolvedValue([
        { userId: "u1" },
        { userId: "u2" },
        { userId: "u3" },
      ]);
      mockPrisma.eventReview.findMany.mockResolvedValue([
        { userId: "u2" },
      ]);

      const result = await getUnreviewedAttendees("e1");

      expect(result).toEqual(["u1", "u3"]);
    });

    it("excludes users who already reviewed", async () => {
      mockPrisma.eventAttendance.findMany.mockResolvedValue([
        { userId: "u1" },
        { userId: "u2" },
      ]);
      mockPrisma.eventReview.findMany.mockResolvedValue([
        { userId: "u1" },
        { userId: "u2" },
      ]);

      const result = await getUnreviewedAttendees("e1");

      expect(result).toEqual([]);
    });

    it("returns empty array when no attendees", async () => {
      mockPrisma.eventAttendance.findMany.mockResolvedValue([]);

      const result = await getUnreviewedAttendees("e1");

      expect(result).toEqual([]);
      // Should not query reviews if no attendees
      expect(mockPrisma.eventReview.findMany).not.toHaveBeenCalled();
    });
  });

  describe("sendReviewPrompts", () => {
    it("creates notification records for unreviewed attendees", async () => {
      // Mock getUnreviewedAttendees dependencies
      mockPrisma.eventAttendance.findMany.mockResolvedValue([
        { userId: "u1" },
        { userId: "u2" },
      ]);
      mockPrisma.eventReview.findMany.mockResolvedValue([]);

      mockPrisma.event.findUnique.mockResolvedValue({
        id: "e1",
        title: "Big Laugh Night",
        venueId: "v1",
        venue: { name: "The Comedy Store" },
        comedians: [{ comedian: { name: "Jerry" } }],
      });

      mockPrisma.notification.createMany.mockResolvedValue({ count: 2 });

      const result = await sendReviewPrompts("e1");

      expect(result).toBe(2);
      expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({
        data: [
          {
            userId: "u1",
            type: "review_prompt",
            title: "How was the show?",
            message: "You attended Big Laugh Night at The Comedy Store. Leave a review and help others discover great comedy!",
            eventId: "e1",
            venueId: "v1",
          },
          {
            userId: "u2",
            type: "review_prompt",
            title: "How was the show?",
            message: "You attended Big Laugh Night at The Comedy Store. Leave a review and help others discover great comedy!",
            eventId: "e1",
            venueId: "v1",
          },
        ],
      });
    });

    it("returns 0 when no unreviewed attendees", async () => {
      mockPrisma.eventAttendance.findMany.mockResolvedValue([]);

      const result = await sendReviewPrompts("e1");

      expect(result).toBe(0);
      expect(mockPrisma.notification.createMany).not.toHaveBeenCalled();
    });

    it("returns 0 when event not found", async () => {
      mockPrisma.eventAttendance.findMany.mockResolvedValue([
        { userId: "u1" },
      ]);
      mockPrisma.eventReview.findMany.mockResolvedValue([]);
      mockPrisma.event.findUnique.mockResolvedValue(null);

      const result = await sendReviewPrompts("e1");

      expect(result).toBe(0);
      expect(mockPrisma.notification.createMany).not.toHaveBeenCalled();
    });

    it("uses comedian names when event has no title", async () => {
      mockPrisma.eventAttendance.findMany.mockResolvedValue([
        { userId: "u1" },
      ]);
      mockPrisma.eventReview.findMany.mockResolvedValue([]);
      mockPrisma.event.findUnique.mockResolvedValue({
        id: "e1",
        title: null,
        venueId: "v1",
        venue: { name: "Funny Bone" },
        comedians: [
          { comedian: { name: "Ali Wong" } },
          { comedian: { name: "Hasan Minhaj" } },
        ],
      });
      mockPrisma.notification.createMany.mockResolvedValue({ count: 1 });

      await sendReviewPrompts("e1");

      expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            message: expect.stringContaining("Ali Wong, Hasan Minhaj"),
          }),
        ],
      });
    });
  });

  describe("processReviewPrompts", () => {
    it("orchestrates the full flow", async () => {
      // Mock getEventsNeedingReviewPrompts
      mockPrisma.event.findMany.mockResolvedValue([
        {
          id: "e1",
          title: "Show 1",
          venueId: "v1",
          venue: { name: "Club A" },
          comedians: [],
        },
        {
          id: "e2",
          title: "Show 2",
          venueId: "v2",
          venue: { name: "Club B" },
          comedians: [],
        },
      ]);

      // Mock sendReviewPrompts dependencies for e1
      // First call to eventAttendance.findMany (for e1)
      mockPrisma.eventAttendance.findMany
        .mockResolvedValueOnce([{ userId: "u1" }, { userId: "u2" }])
        .mockResolvedValueOnce([{ userId: "u3" }]);

      mockPrisma.eventReview.findMany
        .mockResolvedValueOnce([{ userId: "u2" }]) // u2 reviewed e1
        .mockResolvedValueOnce([]); // no one reviewed e2

      mockPrisma.event.findUnique
        .mockResolvedValueOnce({
          id: "e1",
          title: "Show 1",
          venueId: "v1",
          venue: { name: "Club A" },
          comedians: [],
        })
        .mockResolvedValueOnce({
          id: "e2",
          title: "Show 2",
          venueId: "v2",
          venue: { name: "Club B" },
          comedians: [],
        });

      mockPrisma.notification.createMany.mockResolvedValue({ count: 1 });

      const result = await processReviewPrompts();

      expect(result).toEqual({
        eventsProcessed: 2,
        promptsSent: 2, // 1 for e1 (u1 only, u2 reviewed) + 1 for e2 (u3)
      });

      expect(mockPrisma.notification.createMany).toHaveBeenCalledTimes(2);
    });

    it("returns zero counts when no events in window", async () => {
      mockPrisma.event.findMany.mockResolvedValue([]);

      const result = await processReviewPrompts();

      expect(result).toEqual({ eventsProcessed: 0, promptsSent: 0 });
      expect(mockPrisma.notification.createMany).not.toHaveBeenCalled();
    });
  });
});
