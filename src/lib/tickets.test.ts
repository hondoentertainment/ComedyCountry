import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getTicketTypesForEvent,
  purchaseTicket,
  getTicketsForUser,
  getTicketByQR,
  scanTicket,
  refundTicket,
  transferTicket,
} from "./tickets";

vi.mock("./prisma", () => ({
  prisma: {
    ticketType: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    ticket: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  ticketType: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  ticket: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  user: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

describe("tickets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTicketTypesForEvent", () => {
    it("returns ticket types with availability info", async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 86400000);
      const future = new Date(now.getTime() + 86400000);

      mockPrisma.ticketType.findMany.mockResolvedValue([
        {
          id: "tt1",
          eventId: "e1",
          name: "General",
          capacity: 100,
          sold: 30,
          price: 25,
          saleStart: past,
          saleEnd: future,
          sortOrder: 1,
        },
        {
          id: "tt2",
          eventId: "e1",
          name: "VIP",
          capacity: 20,
          sold: 20,
          price: 75,
          saleStart: past,
          saleEnd: future,
          sortOrder: 2,
        },
      ]);

      const result = await getTicketTypesForEvent("e1");

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: "tt1", available: 70, onSale: true });
      expect(result[1]).toMatchObject({ id: "tt2", available: 0, onSale: true });
    });

    it("marks tickets as not on sale when outside sale window", async () => {
      const future = new Date(Date.now() + 86400000);

      mockPrisma.ticketType.findMany.mockResolvedValue([
        {
          id: "tt1",
          eventId: "e1",
          name: "General",
          capacity: 100,
          sold: 0,
          price: 25,
          saleStart: future,
          saleEnd: null,
          sortOrder: 1,
        },
      ]);

      const result = await getTicketTypesForEvent("e1");

      expect(result[0].onSale).toBe(false);
    });

    it("returns empty array when no ticket types exist", async () => {
      mockPrisma.ticketType.findMany.mockResolvedValue([]);
      const result = await getTicketTypesForEvent("e1");
      expect(result).toEqual([]);
    });
  });

  describe("purchaseTicket", () => {
    it("throws when ticket type not found", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue(null);
      await expect(purchaseTicket("u1", "tt1", "e1")).rejects.toThrow("Ticket type not found");
    });

    it("throws when ticket type does not belong to event", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt1",
        eventId: "e2",
        capacity: 100,
        sold: 0,
        saleStart: null,
        saleEnd: null,
      });
      await expect(purchaseTicket("u1", "tt1", "e1")).rejects.toThrow(
        "Ticket type does not belong to this event"
      );
    });

    it("throws when tickets not on sale yet", async () => {
      const future = new Date(Date.now() + 86400000);
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt1",
        eventId: "e1",
        capacity: 100,
        sold: 0,
        saleStart: future,
        saleEnd: null,
      });
      await expect(purchaseTicket("u1", "tt1", "e1")).rejects.toThrow(
        "Tickets are not on sale yet"
      );
    });

    it("throws when sold out", async () => {
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt1",
        eventId: "e1",
        capacity: 50,
        sold: 50,
        saleStart: null,
        saleEnd: null,
      });
      await expect(purchaseTicket("u1", "tt1", "e1")).rejects.toThrow("Sold out");
    });

    it("creates ticket in transaction on success", async () => {
      const mockTicket = { id: "t1", qrCode: "qr123" };
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt1",
        eventId: "e1",
        capacity: 100,
        sold: 10,
        price: 25,
        saleStart: null,
        saleEnd: null,
      });
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          ticketType: {
            findUnique: vi.fn().mockResolvedValue({ id: "tt1", capacity: 100, sold: 10 }),
            update: vi.fn(),
          },
          ticket: {
            create: vi.fn().mockResolvedValue(mockTicket),
          },
        };
        return fn(tx);
      });

      const result = await purchaseTicket("u1", "tt1", "e1");
      expect(result).toEqual(mockTicket);
    });
  });

  describe("getTicketsForUser", () => {
    it("returns tickets with event and ticketType includes", async () => {
      const mockTickets = [
        { id: "t1", userId: "u1", event: { id: "e1" }, ticketType: { id: "tt1" } },
      ];
      mockPrisma.ticket.findMany.mockResolvedValue(mockTickets);

      const result = await getTicketsForUser("u1");

      expect(result).toEqual(mockTickets);
      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "u1" },
          orderBy: { createdAt: "desc" },
        })
      );
    });
  });

  describe("getTicketByQR", () => {
    it("returns ticket when found by QR code", async () => {
      const mockTicket = { id: "t1", qrCode: "qr123" };
      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);

      const result = await getTicketByQR("qr123");

      expect(result).toEqual(mockTicket);
      expect(mockPrisma.ticket.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { qrCode: "qr123" } })
      );
    });

    it("returns null when QR code not found", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);
      const result = await getTicketByQR("invalid");
      expect(result).toBeNull();
    });
  });

  describe("scanTicket", () => {
    it("returns invalid when ticket not found", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);
      const result = await scanTicket("bad-qr");
      expect(result).toEqual({ valid: false, error: "Ticket not found" });
    });

    it("returns invalid when ticket already used", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        id: "t1",
        qrCode: "qr1",
        status: "USED",
        scannedAt: new Date("2025-01-01"),
      });

      const result = await scanTicket("qr1");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Ticket already used");
    });

    it("returns invalid for non-VALID status", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        id: "t1",
        qrCode: "qr1",
        status: "REFUNDED",
      });

      const result = await scanTicket("qr1");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Ticket status: REFUNDED");
    });

    it("marks valid ticket as used", async () => {
      const ticket = { id: "t1", qrCode: "qr1", status: "VALID" };
      const updatedTicket = { ...ticket, status: "USED", scannedAt: new Date() };

      mockPrisma.ticket.findUnique.mockResolvedValue(ticket);
      mockPrisma.ticket.update.mockResolvedValue(updatedTicket);

      const result = await scanTicket("qr1");

      expect(result.valid).toBe(true);
      expect(result.ticket).toEqual(updatedTicket);
      expect(mockPrisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "t1" },
          data: expect.objectContaining({ status: "USED" }),
        })
      );
    });
  });

  describe("refundTicket", () => {
    it("throws when ticket not found", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);
      await expect(refundTicket("t1", "u1")).rejects.toThrow("Ticket not found");
    });

    it("throws when not the owner", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        id: "t1",
        userId: "u2",
        status: "VALID",
      });
      await expect(refundTicket("t1", "u1")).rejects.toThrow("Not your ticket");
    });

    it("throws when ticket is not VALID", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        id: "t1",
        userId: "u1",
        status: "USED",
      });
      await expect(refundTicket("t1", "u1")).rejects.toThrow("Ticket cannot be refunded");
    });

    it("throws when no refund policy", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        id: "t1",
        userId: "u1",
        status: "VALID",
        event: { refundPolicy: null },
      });
      await expect(refundTicket("t1", "u1")).rejects.toThrow("No refund policy for this event");
    });

    it("throws when refund deadline passed", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        id: "t1",
        userId: "u1",
        status: "VALID",
        event: {
          refundPolicy: {
            refundDeadline: new Date("2020-01-01"),
            refundPercent: 100,
          },
        },
      });
      await expect(refundTicket("t1", "u1")).rejects.toThrow("Refund deadline has passed");
    });

    it("processes refund within deadline", async () => {
      const futureDeadline = new Date(Date.now() + 86400000);
      const refundedTicket = { id: "t1", status: "REFUNDED" };

      mockPrisma.ticket.findUnique.mockResolvedValue({
        id: "t1",
        userId: "u1",
        status: "VALID",
        ticketTypeId: "tt1",
        event: {
          refundPolicy: {
            refundDeadline: futureDeadline,
            refundPercent: 80,
          },
        },
      });

      mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          ticketType: { update: vi.fn() },
          ticket: { update: vi.fn().mockResolvedValue(refundedTicket) },
        };
        return fn(tx);
      });

      const result = await refundTicket("t1", "u1");

      expect(result.ticket).toEqual(refundedTicket);
      expect(result.refundPercent).toBe(80);
    });
  });

  describe("transferTicket", () => {
    it("throws when ticket not found", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);
      await expect(transferTicket("t1", "u1", "a@b.com")).rejects.toThrow("Ticket not found");
    });

    it("throws when not the owner", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        id: "t1",
        userId: "u2",
        status: "VALID",
      });
      await expect(transferTicket("t1", "u1", "a@b.com")).rejects.toThrow("Not your ticket");
    });

    it("throws when ticket is not VALID", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        id: "t1",
        userId: "u1",
        status: "USED",
      });
      await expect(transferTicket("t1", "u1", "a@b.com")).rejects.toThrow(
        "Ticket cannot be transferred"
      );
    });

    it("transfers ticket and creates new ticket when recipient exists", async () => {
      const updatedTicket = { id: "t1", status: "TRANSFERRED" };

      mockPrisma.ticket.findUnique.mockResolvedValue({
        id: "t1",
        userId: "u1",
        status: "VALID",
        eventId: "e1",
        ticketTypeId: "tt1",
        purchasePrice: 25,
      });
      mockPrisma.user.findUnique.mockResolvedValue({ id: "u2", email: "a@b.com" });
      mockPrisma.ticket.update.mockResolvedValue(updatedTicket);
      mockPrisma.ticket.create.mockResolvedValue({ id: "t2" });

      const result = await transferTicket("t1", "u1", "a@b.com", "Enjoy!");

      expect(result).toEqual(updatedTicket);
      expect(mockPrisma.ticket.create).toHaveBeenCalled();
    });

    it("transfers ticket without creating new ticket when recipient not found", async () => {
      const updatedTicket = { id: "t1", status: "TRANSFERRED" };

      mockPrisma.ticket.findUnique.mockResolvedValue({
        id: "t1",
        userId: "u1",
        status: "VALID",
        eventId: "e1",
        ticketTypeId: "tt1",
        purchasePrice: 25,
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.ticket.update.mockResolvedValue(updatedTicket);

      const result = await transferTicket("t1", "u1", "nobody@b.com");

      expect(result).toEqual(updatedTicket);
      expect(mockPrisma.ticket.create).not.toHaveBeenCalled();
    });
  });
});
