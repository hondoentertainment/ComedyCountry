import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getComedianForUser,
  getExclusiveContent,
  createExclusiveContent,
  getFanTipLeaderboard,
  createFanTip,
  getBookingRequests,
  respondToBooking,
  getSetlist,
  addSetlistEntry,
  getRevenueStats,
} from "./creator";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    comedianClaim: { findFirst: vi.fn() },
    comedian: { findUnique: vi.fn(), findMany: vi.fn() },
    exclusiveContent: { findMany: vi.fn(), create: vi.fn() },
    fanTip: { findMany: vi.fn(), create: vi.fn(), aggregate: vi.fn(), count: vi.fn() },
    bookingRequest: { findMany: vi.fn(), update: vi.fn(), count: vi.fn() },
    setlistEntry: { findMany: vi.fn(), create: vi.fn() },
    merchItem: { count: vi.fn() },
    event: { findMany: vi.fn() },
    ticket: { aggregate: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  comedianClaim: { findFirst: ReturnType<typeof vi.fn> };
  comedian: { findUnique: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  exclusiveContent: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  fanTip: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  bookingRequest: {
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  setlistEntry: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  merchItem: { count: ReturnType<typeof vi.fn> };
  event: { findMany: ReturnType<typeof vi.fn> };
  ticket: { aggregate: ReturnType<typeof vi.fn> };
};

describe("creator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getComedianForUser", () => {
    it("returns null when no approved claim exists", async () => {
      mockPrisma.comedianClaim.findFirst.mockResolvedValue(null);
      const result = await getComedianForUser("u1");
      expect(result).toBeNull();
    });

    it("returns comedian when approved claim exists", async () => {
      const comedian = { id: "c1", name: "Dave" };
      mockPrisma.comedianClaim.findFirst.mockResolvedValue({
        userId: "u1",
        comedianId: "c1",
        status: "APPROVED",
      });
      mockPrisma.comedian.findUnique.mockResolvedValue(comedian);

      const result = await getComedianForUser("u1");

      expect(result).toEqual(comedian);
      expect(mockPrisma.comedianClaim.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "u1", status: "APPROVED" },
        })
      );
    });
  });

  describe("getExclusiveContent", () => {
    it("strips gated content for non-owners", async () => {
      mockPrisma.exclusiveContent.findMany.mockResolvedValue([
        { id: "ec1", title: "Free Post", isGated: false, body: "hello", mediaUrl: null, embedUrl: null },
        { id: "ec2", title: "Premium", isGated: true, body: "secret", mediaUrl: "url", embedUrl: "embed" },
      ]);
      mockPrisma.comedianClaim.findFirst.mockResolvedValue(null);

      const result = await getExclusiveContent("c1", "u-visitor");

      expect(result[0].body).toBe("hello");
      expect(result[1].body).toBeNull();
      expect(result[1].mediaUrl).toBeNull();
      expect(result[1].embedUrl).toBeNull();
    });

    it("shows full content for comedian owner", async () => {
      mockPrisma.exclusiveContent.findMany.mockResolvedValue([
        { id: "ec2", title: "Premium", isGated: true, body: "secret", mediaUrl: "url", embedUrl: "embed" },
      ]);
      mockPrisma.comedianClaim.findFirst.mockResolvedValue({ userId: "u1", comedianId: "c1" });

      const result = await getExclusiveContent("c1", "u1");

      expect(result[0].body).toBe("secret");
      expect(result[0].mediaUrl).toBe("url");
    });

    it("strips gated content when no userId provided", async () => {
      mockPrisma.exclusiveContent.findMany.mockResolvedValue([
        { id: "ec1", title: "Post", isGated: true, body: "hidden", mediaUrl: "x", embedUrl: "y" },
      ]);

      const result = await getExclusiveContent("c1");

      expect(result[0].body).toBeNull();
    });
  });

  describe("createExclusiveContent", () => {
    it("creates content with provided data", async () => {
      const created = { id: "ec1", comedianId: "c1", title: "New Post" };
      mockPrisma.exclusiveContent.create.mockResolvedValue(created);

      const result = await createExclusiveContent("c1", { title: "New Post", isGated: true });

      expect(result).toEqual(created);
      expect(mockPrisma.exclusiveContent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          comedianId: "c1",
          title: "New Post",
          isGated: true,
        }),
      });
    });

    it("defaults isGated to false", async () => {
      mockPrisma.exclusiveContent.create.mockResolvedValue({ id: "ec1" });

      await createExclusiveContent("c1", { title: "Free Post" });

      expect(mockPrisma.exclusiveContent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isGated: false }),
      });
    });
  });

  describe("getFanTipLeaderboard", () => {
    it("returns tips ordered by amount descending", async () => {
      const tips = [
        { id: "ft1", amount: 100 },
        { id: "ft2", amount: 50 },
      ];
      mockPrisma.fanTip.findMany.mockResolvedValue(tips);

      const result = await getFanTipLeaderboard("c1");

      expect(result).toEqual(tips);
      expect(mockPrisma.fanTip.findMany).toHaveBeenCalledWith({
        where: { comedianId: "c1" },
        orderBy: { amount: "desc" },
        take: 10,
      });
    });

    it("respects custom limit", async () => {
      mockPrisma.fanTip.findMany.mockResolvedValue([]);

      await getFanTipLeaderboard("c1", 5);

      expect(mockPrisma.fanTip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      );
    });
  });

  describe("createFanTip", () => {
    it("creates a fan tip record", async () => {
      const tip = { id: "ft1", comedianId: "c1", userId: "u1", amount: 10 };
      mockPrisma.fanTip.create.mockResolvedValue(tip);

      const result = await createFanTip("c1", "u1", 10, "beer", "Great show!");

      expect(result).toEqual(tip);
      expect(mockPrisma.fanTip.create).toHaveBeenCalledWith({
        data: {
          comedianId: "c1",
          userId: "u1",
          amount: 10,
          giftType: "beer",
          message: "Great show!",
        },
      });
    });
  });

  describe("getBookingRequests", () => {
    it("returns all bookings for comedian", async () => {
      const bookings = [{ id: "b1", comedianId: "c1" }];
      mockPrisma.bookingRequest.findMany.mockResolvedValue(bookings);

      const result = await getBookingRequests("c1");

      expect(result).toEqual(bookings);
    });

    it("filters by status when provided", async () => {
      mockPrisma.bookingRequest.findMany.mockResolvedValue([]);

      await getBookingRequests("c1", "PENDING");

      expect(mockPrisma.bookingRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { comedianId: "c1", status: "PENDING" },
        })
      );
    });
  });

  describe("respondToBooking", () => {
    it("updates booking status and respondedAt", async () => {
      const updated = { id: "b1", status: "ACCEPTED" };
      mockPrisma.bookingRequest.update.mockResolvedValue(updated);

      const result = await respondToBooking("b1", "ACCEPTED", "Looking forward to it!");

      expect(result).toEqual(updated);
      expect(mockPrisma.bookingRequest.update).toHaveBeenCalledWith({
        where: { id: "b1" },
        data: expect.objectContaining({
          status: "ACCEPTED",
          responseNote: "Looking forward to it!",
        }),
      });
    });
  });

  describe("getSetlist", () => {
    it("returns setlist entries", async () => {
      const entries = [{ id: "s1", bitName: "Airport bit" }];
      mockPrisma.setlistEntry.findMany.mockResolvedValue(entries);

      const result = await getSetlist("c1");

      expect(result).toEqual(entries);
      expect(mockPrisma.setlistEntry.findMany).toHaveBeenCalledWith({
        where: { comedianId: "c1" },
        orderBy: { performedAt: "desc" },
        take: 50,
      });
    });
  });

  describe("addSetlistEntry", () => {
    it("creates a new setlist entry", async () => {
      const entry = { id: "s1", comedianId: "c1", bitName: "Airport" };
      mockPrisma.setlistEntry.create.mockResolvedValue(entry);

      const result = await addSetlistEntry("c1", {
        bitName: "Airport",
        durationMin: 7,
        crowdRating: 4,
      });

      expect(result).toEqual(entry);
      expect(mockPrisma.setlistEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          comedianId: "c1",
          bitName: "Airport",
          durationMin: 7,
          crowdRating: 4,
        }),
      });
    });
  });

  describe("getRevenueStats", () => {
    it("aggregates revenue across all sources", async () => {
      mockPrisma.fanTip.aggregate.mockResolvedValue({ _sum: { amount: 500 } });
      mockPrisma.fanTip.count.mockResolvedValue(15);
      mockPrisma.merchItem.count.mockResolvedValue(3);
      mockPrisma.bookingRequest.count.mockResolvedValue(2);
      mockPrisma.event.findMany.mockResolvedValue([{ id: "e1" }, { id: "e2" }]);
      mockPrisma.ticket.aggregate.mockResolvedValue({
        _sum: { purchasePrice: 1200 },
        _count: 48,
      });

      const result = await getRevenueStats("c1");

      expect(result).toEqual({
        totalTips: 500,
        tipCount: 15,
        ticketRevenue: 1200,
        ticketsSold: 48,
        merchItemCount: 3,
        confirmedBookings: 2,
      });
    });

    it("handles zero events gracefully", async () => {
      mockPrisma.fanTip.aggregate.mockResolvedValue({ _sum: { amount: null } });
      mockPrisma.fanTip.count.mockResolvedValue(0);
      mockPrisma.merchItem.count.mockResolvedValue(0);
      mockPrisma.bookingRequest.count.mockResolvedValue(0);
      mockPrisma.event.findMany.mockResolvedValue([]);

      const result = await getRevenueStats("c1");

      expect(result.totalTips).toBe(0);
      expect(result.ticketRevenue).toBe(0);
      expect(result.ticketsSold).toBe(0);
    });
  });
});
