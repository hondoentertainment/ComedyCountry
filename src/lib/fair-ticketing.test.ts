import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createFairPricePolicy,
  getFairPricePolicy,
  calculateTransparentPrice,
  getFeeBreakdown,
  verifyTicketHolder,
  checkTicketVerification,
  joinWaitlistQueue,
  getWaitlistPosition,
  processWaitlistQueue,
  claimWaitlistTicket,
  requestResale,
  approveResale,
  purchaseResaleTicket,
  getResaleListings,
  detectScalpingPattern,
} from "./fair-ticketing";

vi.mock("./prisma", () => ({
  prisma: {
    event: {
      findUnique: vi.fn(),
    },
    fairPricePolicy: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    ticketType: {
      findUnique: vi.fn(),
    },
    priceTransparencyLog: {
      create: vi.fn(),
    },
    ticket: {
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    ticketVerification: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    ticketWaitlistQueue: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    resaleListingRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  event: { findUnique: ReturnType<typeof vi.fn> };
  fairPricePolicy: {
    upsert: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  ticketType: { findUnique: ReturnType<typeof vi.fn> };
  priceTransparencyLog: { create: ReturnType<typeof vi.fn> };
  ticket: {
    findUnique: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  ticketVerification: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  ticketWaitlistQueue: {
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  resaleListingRequest: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

describe("fair-ticketing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Fair Price Policy ────────────────────────────────────────────────────

  describe("createFairPricePolicy", () => {
    it("creates a fair price policy for an event", async () => {
      const policy = {
        id: "fp1",
        eventId: "e1",
        showAllFees: true,
        maxMarkupPercent: 10,
        allowResale: true,
        resaleMaxPercent: 20,
        antiScalpingEnabled: true,
      };
      mockPrisma.event.findUnique.mockResolvedValue({ id: "e1" });
      mockPrisma.fairPricePolicy.upsert.mockResolvedValue(policy);

      const result = await createFairPricePolicy("e1", {
        showAllFees: true,
        maxMarkupPercent: 10,
        allowResale: true,
        resaleMaxPercent: 20,
        antiScalpingEnabled: true,
      });

      expect(result).toEqual(policy);
      expect(mockPrisma.fairPricePolicy.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId: "e1" },
        })
      );
    });

    it("throws when event not found", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await expect(
        createFairPricePolicy("bad-id", { showAllFees: true })
      ).rejects.toThrow("Event not found");
    });

    it("uses defaults when config is empty", async () => {
      mockPrisma.event.findUnique.mockResolvedValue({ id: "e1" });
      mockPrisma.fairPricePolicy.upsert.mockResolvedValue({ id: "fp1" });

      await createFairPricePolicy("e1", {});

      expect(mockPrisma.fairPricePolicy.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            showAllFees: true,
            maxMarkupPercent: 0,
            allowResale: false,
            resaleMaxPercent: 0,
            antiScalpingEnabled: true,
          }),
        })
      );
    });
  });

  describe("getFairPricePolicy", () => {
    it("returns the policy for an event", async () => {
      const policy = { id: "fp1", eventId: "e1", showAllFees: true };
      mockPrisma.fairPricePolicy.findUnique.mockResolvedValue(policy);

      const result = await getFairPricePolicy("e1");

      expect(result).toEqual(policy);
      expect(mockPrisma.fairPricePolicy.findUnique).toHaveBeenCalledWith({
        where: { eventId: "e1" },
      });
    });

    it("returns null when no policy exists", async () => {
      mockPrisma.fairPricePolicy.findUnique.mockResolvedValue(null);

      const result = await getFairPricePolicy("e1");
      expect(result).toBeNull();
    });
  });

  // ── Transparent Pricing ────────────────────────────────────────────────

  describe("calculateTransparentPrice", () => {
    it("calculates price with all fees shown upfront", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt1",
        eventId: "e1",
        name: "GA",
        price: 50,
      });
      mockPrisma.priceTransparencyLog.create.mockResolvedValue({});

      const result = await calculateTransparentPrice("tt1", "e1");

      expect(result.basePrice).toBe(50);
      expect(result.serviceFee).toBe(5); // 10%
      expect(result.processingFee).toBe(1.75); // 2.9% + $0.30
      expect(result.totalPrice).toBe(56.75);
      expect(result.feePercentage).toBeCloseTo(13.5, 1);
    });

    it("logs to PriceTransparencyLog", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt1",
        eventId: "e1",
        name: "GA",
        price: 25,
      });
      mockPrisma.priceTransparencyLog.create.mockResolvedValue({});

      await calculateTransparentPrice("tt1", "e1");

      expect(mockPrisma.priceTransparencyLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ticketTypeId: "tt1",
        }),
      });
    });

    it("throws when ticket type not found", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue(null);

      await expect(calculateTransparentPrice("bad", "e1")).rejects.toThrow(
        "Ticket type not found"
      );
    });

    it("throws when ticket type does not belong to event", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt1",
        eventId: "e2",
        price: 50,
      });

      await expect(calculateTransparentPrice("tt1", "e1")).rejects.toThrow(
        "Ticket type does not belong to this event"
      );
    });

    it("handles zero price tickets", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt1",
        eventId: "e1",
        price: 0,
      });
      mockPrisma.priceTransparencyLog.create.mockResolvedValue({});

      const result = await calculateTransparentPrice("tt1", "e1");

      expect(result.basePrice).toBe(0);
      expect(result.feePercentage).toBe(0);
      expect(result.totalPrice).toBe(0.3); // just processing flat fee
    });
  });

  describe("getFeeBreakdown", () => {
    it("returns detailed fee structure with policy info", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt1",
        eventId: "e1",
        name: "VIP",
        price: 100,
      });
      mockPrisma.fairPricePolicy.findUnique.mockResolvedValue({
        showAllFees: true,
        antiScalpingEnabled: true,
      });

      const result = await getFeeBreakdown("tt1", "e1");

      expect(result.ticketTypeName).toBe("VIP");
      expect(result.basePrice).toBe(100);
      expect(result.serviceFee).toBe(10);
      expect(result.showAllFees).toBe(true);
      expect(result.antiScalpingEnabled).toBe(true);
    });

    it("returns defaults when no policy exists", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt1",
        eventId: "e1",
        name: "GA",
        price: 30,
      });
      mockPrisma.fairPricePolicy.findUnique.mockResolvedValue(null);

      const result = await getFeeBreakdown("tt1", "e1");

      expect(result.showAllFees).toBe(true);
      expect(result.antiScalpingEnabled).toBe(false);
    });

    it("throws when ticket type not found", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue(null);
      await expect(getFeeBreakdown("bad", "e1")).rejects.toThrow(
        "Ticket type not found"
      );
    });
  });

  // ── Identity Verification ──────────────────────────────────────────────

  describe("verifyTicketHolder", () => {
    it("creates a verification record for a ticket", async () => {
      const verification = {
        id: "v1",
        ticketId: "t1",
        verificationMethod: "EMAIL",
        isVerified: true,
      };
      mockPrisma.ticket.findUnique.mockResolvedValue({ id: "t1" });
      mockPrisma.ticketVerification.create.mockResolvedValue(verification);

      const result = await verifyTicketHolder("t1", "EMAIL", {
        email: "user@example.com",
      });

      expect(result).toEqual(verification);
      expect(mockPrisma.ticketVerification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ticketId: "t1",
          verificationMethod: "EMAIL",
          isVerified: true,
        }),
      });
    });

    it("throws when ticket not found", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);

      await expect(
        verifyTicketHolder("bad", "PHONE", { phone: "555-1234" })
      ).rejects.toThrow("Ticket not found");
    });

    it("supports ID_SCAN verification method", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({ id: "t1" });
      mockPrisma.ticketVerification.create.mockResolvedValue({ id: "v1" });

      await verifyTicketHolder("t1", "ID_SCAN", { scanId: "abc123" });

      expect(mockPrisma.ticketVerification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          verificationMethod: "ID_SCAN",
        }),
      });
    });
  });

  describe("checkTicketVerification", () => {
    it("returns verified status when verification exists", async () => {
      const verification = {
        id: "v1",
        ticketId: "t1",
        isVerified: true,
        verificationMethod: "EMAIL",
      };
      mockPrisma.ticketVerification.findFirst.mockResolvedValue(verification);

      const result = await checkTicketVerification("t1");

      expect(result.isVerified).toBe(true);
      expect(result.verification).toEqual(verification);
    });

    it("returns not verified when no verification exists", async () => {
      mockPrisma.ticketVerification.findFirst.mockResolvedValue(null);

      const result = await checkTicketVerification("t1");

      expect(result.isVerified).toBe(false);
      expect(result.verification).toBeNull();
    });
  });

  // ── Waitlist Queue ─────────────────────────────────────────────────────

  describe("joinWaitlistQueue", () => {
    it("adds user to waitlist with correct position", async () => {
      mockPrisma.ticketWaitlistQueue.findUnique.mockResolvedValue(null);
      mockPrisma.ticketWaitlistQueue.findFirst.mockResolvedValue({
        position: 5,
      });
      const entry = {
        id: "wl1",
        eventId: "e1",
        userId: "u1",
        position: 6,
        status: "WAITING",
      };
      mockPrisma.ticketWaitlistQueue.create.mockResolvedValue(entry);

      const result = await joinWaitlistQueue("e1", "u1");

      expect(result).toEqual(entry);
      expect(mockPrisma.ticketWaitlistQueue.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventId: "e1",
          userId: "u1",
          position: 6,
          status: "WAITING",
        }),
      });
    });

    it("starts at position 1 when queue is empty", async () => {
      mockPrisma.ticketWaitlistQueue.findUnique.mockResolvedValue(null);
      mockPrisma.ticketWaitlistQueue.findFirst.mockResolvedValue(null);
      mockPrisma.ticketWaitlistQueue.create.mockResolvedValue({
        id: "wl1",
        position: 1,
      });

      await joinWaitlistQueue("e1", "u1");

      expect(mockPrisma.ticketWaitlistQueue.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ position: 1 }),
      });
    });

    it("throws when user already in waitlist", async () => {
      mockPrisma.ticketWaitlistQueue.findUnique.mockResolvedValue({
        id: "wl1",
        eventId: "e1",
        userId: "u1",
      });

      await expect(joinWaitlistQueue("e1", "u1")).rejects.toThrow(
        "Already in waitlist"
      );
    });
  });

  describe("getWaitlistPosition", () => {
    it("returns position and ahead count", async () => {
      mockPrisma.ticketWaitlistQueue.findUnique.mockResolvedValue({
        id: "wl1",
        eventId: "e1",
        userId: "u3",
        position: 5,
        status: "WAITING",
        joinedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      });
      mockPrisma.ticketWaitlistQueue.count.mockResolvedValue(3); // 3 ahead

      const result = await getWaitlistPosition("e1", "u3");

      expect(result).not.toBeNull();
      expect(result!.position).toBe(5);
      expect(result!.effectivePosition).toBe(4); // 3 ahead + 1
      expect(result!.status).toBe("WAITING");
    });

    it("returns null when user not in waitlist", async () => {
      mockPrisma.ticketWaitlistQueue.findUnique.mockResolvedValue(null);

      const result = await getWaitlistPosition("e1", "u1");
      expect(result).toBeNull();
    });
  });

  describe("processWaitlistQueue", () => {
    it("offers tickets to next N people in FIFO order", async () => {
      const waiting = [
        { id: "wl1", position: 1, status: "WAITING" },
        { id: "wl2", position: 2, status: "WAITING" },
      ];
      mockPrisma.ticketWaitlistQueue.findMany.mockResolvedValue(waiting);
      mockPrisma.ticketWaitlistQueue.update
        .mockResolvedValueOnce({ ...waiting[0], status: "OFFERED" })
        .mockResolvedValueOnce({ ...waiting[1], status: "OFFERED" });

      const result = await processWaitlistQueue("e1", 2);

      expect(result.offered).toBe(2);
      expect(result.entries).toHaveLength(2);
      expect(mockPrisma.ticketWaitlistQueue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId: "e1", status: "WAITING" },
          orderBy: { position: "asc" },
          take: 2,
        })
      );
    });

    it("handles empty waitlist", async () => {
      mockPrisma.ticketWaitlistQueue.findMany.mockResolvedValue([]);

      const result = await processWaitlistQueue("e1", 5);

      expect(result.offered).toBe(0);
      expect(result.entries).toHaveLength(0);
    });
  });

  describe("claimWaitlistTicket", () => {
    it("claims an offered ticket", async () => {
      const futureExpiry = new Date(Date.now() + 86400000);
      mockPrisma.ticketWaitlistQueue.findUnique.mockResolvedValue({
        id: "wl1",
        eventId: "e1",
        userId: "u1",
        status: "OFFERED",
        expiresAt: futureExpiry,
      });
      const claimed = { id: "wl1", status: "CLAIMED" };
      mockPrisma.ticketWaitlistQueue.update.mockResolvedValue(claimed);

      const result = await claimWaitlistTicket("e1", "u1");

      expect(result).toEqual(claimed);
      expect(mockPrisma.ticketWaitlistQueue.update).toHaveBeenCalledWith({
        where: { id: "wl1" },
        data: expect.objectContaining({ status: "CLAIMED" }),
      });
    });

    it("throws when not in waitlist", async () => {
      mockPrisma.ticketWaitlistQueue.findUnique.mockResolvedValue(null);

      await expect(claimWaitlistTicket("e1", "u1")).rejects.toThrow(
        "Not in waitlist"
      );
    });

    it("throws when no offer available", async () => {
      mockPrisma.ticketWaitlistQueue.findUnique.mockResolvedValue({
        id: "wl1",
        status: "WAITING",
      });

      await expect(claimWaitlistTicket("e1", "u1")).rejects.toThrow(
        "No offer available"
      );
    });

    it("expires offer when past expiry time", async () => {
      const pastExpiry = new Date(Date.now() - 86400000);
      mockPrisma.ticketWaitlistQueue.findUnique.mockResolvedValue({
        id: "wl1",
        status: "OFFERED",
        expiresAt: pastExpiry,
      });
      mockPrisma.ticketWaitlistQueue.update.mockResolvedValue({
        id: "wl1",
        status: "EXPIRED",
      });

      await expect(claimWaitlistTicket("e1", "u1")).rejects.toThrow(
        "Offer has expired"
      );

      expect(mockPrisma.ticketWaitlistQueue.update).toHaveBeenCalledWith({
        where: { id: "wl1" },
        data: { status: "EXPIRED" },
      });
    });
  });

  // ── Controlled Resale ──────────────────────────────────────────────────

  describe("requestResale", () => {
    it("creates a resale request when policy allows", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        id: "t1",
        userId: "u1",
        status: "VALID",
        purchasePrice: 50,
        event: {
          fairPricePolicy: {
            allowResale: true,
            resaleMaxPercent: 20,
            maxMarkupPercent: 10,
          },
        },
      });
      const listing = { id: "rl1", ticketId: "t1", listingStatus: "PENDING" };
      mockPrisma.resaleListingRequest.create.mockResolvedValue(listing);

      const result = await requestResale("t1", "u1", 55);

      expect(result).toEqual(listing);
    });

    it("enforces max markup limit", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        id: "t1",
        userId: "u1",
        status: "VALID",
        purchasePrice: 50,
        event: {
          fairPricePolicy: {
            allowResale: true,
            resaleMaxPercent: 20,
            maxMarkupPercent: 10,
          },
        },
      });

      await expect(requestResale("t1", "u1", 100)).rejects.toThrow(
        "Max resale price cannot exceed $60.00 (20% above face value)"
      );
    });

    it("throws when resale not allowed", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        id: "t1",
        userId: "u1",
        status: "VALID",
        purchasePrice: 50,
        event: { fairPricePolicy: { allowResale: false } },
      });

      await expect(requestResale("t1", "u1", 55)).rejects.toThrow(
        "Resale is not allowed for this event"
      );
    });

    it("throws when no fair price policy exists", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        id: "t1",
        userId: "u1",
        status: "VALID",
        purchasePrice: 50,
        event: { fairPricePolicy: null },
      });

      await expect(requestResale("t1", "u1", 55)).rejects.toThrow(
        "Resale is not allowed for this event"
      );
    });

    it("throws when ticket not found", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);

      await expect(requestResale("bad", "u1", 55)).rejects.toThrow(
        "Ticket not found"
      );
    });

    it("throws when not the ticket owner", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        id: "t1",
        userId: "u2",
        status: "VALID",
        event: { fairPricePolicy: { allowResale: true } },
      });

      await expect(requestResale("t1", "u1", 55)).rejects.toThrow(
        "Not your ticket"
      );
    });

    it("throws when ticket status is not VALID", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        id: "t1",
        userId: "u1",
        status: "USED",
        event: { fairPricePolicy: { allowResale: true } },
      });

      await expect(requestResale("t1", "u1", 55)).rejects.toThrow(
        "Ticket cannot be resold"
      );
    });
  });

  describe("approveResale", () => {
    it("approves a pending resale request", async () => {
      mockPrisma.resaleListingRequest.findUnique.mockResolvedValue({
        id: "rl1",
        listingStatus: "PENDING",
      });
      const listed = { id: "rl1", listingStatus: "LISTED" };
      mockPrisma.resaleListingRequest.update.mockResolvedValue(listed);

      const result = await approveResale("rl1");

      expect(result).toEqual(listed);
    });

    it("throws when request not found", async () => {
      mockPrisma.resaleListingRequest.findUnique.mockResolvedValue(null);

      await expect(approveResale("bad")).rejects.toThrow(
        "Resale request not found"
      );
    });

    it("throws when request is not pending", async () => {
      mockPrisma.resaleListingRequest.findUnique.mockResolvedValue({
        id: "rl1",
        listingStatus: "LISTED",
      });

      await expect(approveResale("rl1")).rejects.toThrow(
        "Request is not in pending status"
      );
    });
  });

  describe("purchaseResaleTicket", () => {
    it("purchases a listed resale ticket with artist revenue share", async () => {
      mockPrisma.resaleListingRequest.findUnique.mockResolvedValue({
        id: "rl1",
        listingStatus: "LISTED",
        sellerId: "u1",
        maxPrice: 60,
        artistRevShare: 15,
        ticket: { purchasePrice: 50 },
      });
      mockPrisma.resaleListingRequest.update.mockResolvedValue({
        id: "rl1",
        listingStatus: "SOLD",
        buyerId: "u2",
      });

      const result = await purchaseResaleTicket("rl1", "u2");

      expect(result.salePrice).toBe(60);
      expect(result.originalPrice).toBe(50);
      expect(result.profit).toBe(10);
      expect(result.artistShare).toBe(1.5); // 15% of $10 profit
      expect(result.sellerProceeds).toBe(58.5); // $60 - $1.50
    });

    it("throws when listing not found", async () => {
      mockPrisma.resaleListingRequest.findUnique.mockResolvedValue(null);

      await expect(purchaseResaleTicket("bad", "u2")).rejects.toThrow(
        "Resale listing not found"
      );
    });

    it("throws when listing not available", async () => {
      mockPrisma.resaleListingRequest.findUnique.mockResolvedValue({
        id: "rl1",
        listingStatus: "SOLD",
      });

      await expect(purchaseResaleTicket("rl1", "u2")).rejects.toThrow(
        "Listing is not available"
      );
    });

    it("prevents self-purchase (cannot buy your own ticket)", async () => {
      mockPrisma.resaleListingRequest.findUnique.mockResolvedValue({
        id: "rl1",
        listingStatus: "LISTED",
        sellerId: "u1",
        ticket: { purchasePrice: 50 },
      });

      await expect(purchaseResaleTicket("rl1", "u1")).rejects.toThrow(
        "Cannot buy your own ticket"
      );
    });

    it("handles no profit scenario (artist share is 0)", async () => {
      mockPrisma.resaleListingRequest.findUnique.mockResolvedValue({
        id: "rl1",
        listingStatus: "LISTED",
        sellerId: "u1",
        maxPrice: 50,
        artistRevShare: 15,
        ticket: { purchasePrice: 50 },
      });
      mockPrisma.resaleListingRequest.update.mockResolvedValue({
        id: "rl1",
        listingStatus: "SOLD",
      });

      const result = await purchaseResaleTicket("rl1", "u2");

      expect(result.profit).toBe(0);
      expect(result.artistShare).toBe(0);
      expect(result.sellerProceeds).toBe(50);
    });
  });

  describe("getResaleListings", () => {
    it("returns listed resale tickets for an event", async () => {
      const listings = [
        { id: "rl1", maxPrice: 55, ticket: { eventId: "e1" } },
        { id: "rl2", maxPrice: 60, ticket: { eventId: "e1" } },
      ];
      mockPrisma.resaleListingRequest.findMany.mockResolvedValue(listings);

      const result = await getResaleListings("e1");

      expect(result).toEqual(listings);
      expect(mockPrisma.resaleListingRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            listingStatus: "LISTED",
            ticket: { eventId: "e1" },
          },
          orderBy: { maxPrice: "asc" },
        })
      );
    });

    it("returns empty array when no listings exist", async () => {
      mockPrisma.resaleListingRequest.findMany.mockResolvedValue([]);

      const result = await getResaleListings("e1");
      expect(result).toEqual([]);
    });
  });

  // ── Anti-Scalping Detection ────────────────────────────────────────────

  describe("detectScalpingPattern", () => {
    it("flags bulk purchases", async () => {
      mockPrisma.ticket.count.mockResolvedValue(8); // above threshold of 6
      mockPrisma.resaleListingRequest.count.mockResolvedValue(0);

      const result = await detectScalpingPattern("u1");

      expect(result.isSuspicious).toBe(true);
      expect(result.isBulkBuyer).toBe(true);
      expect(result.isRapidReseller).toBe(false);
      expect(result.recentPurchases).toBe(8);
    });

    it("flags rapid resale patterns", async () => {
      mockPrisma.ticket.count.mockResolvedValue(2);
      mockPrisma.resaleListingRequest.count.mockResolvedValue(4); // above threshold of 3

      const result = await detectScalpingPattern("u1");

      expect(result.isSuspicious).toBe(true);
      expect(result.isBulkBuyer).toBe(false);
      expect(result.isRapidReseller).toBe(true);
    });

    it("flags both bulk and rapid resale", async () => {
      mockPrisma.ticket.count.mockResolvedValue(10);
      mockPrisma.resaleListingRequest.count.mockResolvedValue(5);

      const result = await detectScalpingPattern("u1");

      expect(result.isSuspicious).toBe(true);
      expect(result.isBulkBuyer).toBe(true);
      expect(result.isRapidReseller).toBe(true);
    });

    it("returns not suspicious for normal patterns", async () => {
      mockPrisma.ticket.count.mockResolvedValue(2);
      mockPrisma.resaleListingRequest.count.mockResolvedValue(1);

      const result = await detectScalpingPattern("u1");

      expect(result.isSuspicious).toBe(false);
      expect(result.isBulkBuyer).toBe(false);
      expect(result.isRapidReseller).toBe(false);
    });

    it("includes threshold information", async () => {
      mockPrisma.ticket.count.mockResolvedValue(0);
      mockPrisma.resaleListingRequest.count.mockResolvedValue(0);

      const result = await detectScalpingPattern("u1");

      expect(result.thresholds.bulkPurchase).toBe(6);
      expect(result.thresholds.rapidResale).toBe(3);
    });
  });
});
