import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateWalletPass,
  getWalletPass,
  getUserPasses,
  voidWalletPass,
  updatePassStatus,
  generateApplePassPayload,
  generateGooglePassPayload,
} from "./wallet-passes";

vi.mock("./prisma", () => ({
  prisma: {
    ticket: {
      findUnique: vi.fn(),
    },
    walletPass: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// crypto is a Node built-in — no mock needed; randomBytes works in test env

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  ticket: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  walletPass: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const mockTicket = {
  id: "ticket1",
  purchasedAt: new Date("2026-01-15"),
  event: {
    id: "e1",
    title: "Comedy Night",
    date: new Date("2026-03-20"),
    showtime: "8:00 PM",
    venue: {
      name: "Laugh Factory",
      city: "Chicago",
      state: "IL",
      address: "123 Comedy St",
    },
  },
};

describe("wallet-passes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateWalletPass", () => {
    it("generates an Apple wallet pass", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrisma.walletPass.create.mockImplementation(async ({ data }: any) => ({
        id: "wp1",
        ...data,
      }));

      const result = await generateWalletPass("u1", "ticket1", "apple");

      expect(result.platform).toBe("apple");
      expect(result.status).toBe("active");
      expect(result.serialNumber).toMatch(/^PASS-[A-F0-9]+$/);
      expect(result.payload).toBeDefined();
      expect(result.payload.passTypeIdentifier).toBe("pass.com.punchlineatlas.ticket");
      expect(result.payload.eventTicket).toBeDefined();
    });

    it("generates a Google wallet pass", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrisma.walletPass.create.mockImplementation(async ({ data }: any) => ({
        id: "wp2",
        ...data,
      }));

      const result = await generateWalletPass("u1", "ticket1", "google");

      expect(result.platform).toBe("google");
      expect(result.payload).toBeDefined();
      expect(result.payload.classId).toBe("punchlineatlas.comedy_ticket");
    });

    it("throws when ticket not found", async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);

      await expect(
        generateWalletPass("u1", "nonexistent", "apple"),
      ).rejects.toThrow("Ticket not found");
    });

    it("throws for invalid platform", async () => {
      await expect(
        generateWalletPass("u1", "ticket1", "samsung" as any),
      ).rejects.toThrow("Platform must be 'apple' or 'google'");
    });
  });

  describe("getWalletPass", () => {
    it("returns a pass by serial number", async () => {
      const pass = { id: "wp1", serialNumber: "PASS-ABC", status: "active" };
      mockPrisma.walletPass.findUnique.mockResolvedValue(pass);

      const result = await getWalletPass("PASS-ABC");

      expect(result).toEqual(pass);
    });

    it("throws when pass not found", async () => {
      mockPrisma.walletPass.findUnique.mockResolvedValue(null);

      await expect(getWalletPass("PASS-NONEXISTENT")).rejects.toThrow(
        "Wallet pass not found",
      );
    });
  });

  describe("getUserPasses", () => {
    it("returns all passes for a user", async () => {
      const passes = [
        { id: "wp1", userId: "u1", platform: "apple" },
        { id: "wp2", userId: "u1", platform: "google" },
      ];
      mockPrisma.walletPass.findMany.mockResolvedValue(passes);

      const result = await getUserPasses("u1");

      expect(result).toHaveLength(2);
      expect(mockPrisma.walletPass.findMany).toHaveBeenCalledWith({
        where: { userId: "u1" },
        orderBy: { createdAt: "desc" },
      });
    });

    it("returns empty array when user has no passes", async () => {
      mockPrisma.walletPass.findMany.mockResolvedValue([]);

      const result = await getUserPasses("u1");

      expect(result).toEqual([]);
    });
  });

  describe("voidWalletPass", () => {
    it("voids an active pass", async () => {
      mockPrisma.walletPass.findUnique.mockResolvedValue({
        id: "wp1",
        serialNumber: "PASS-ABC",
        status: "active",
      });
      mockPrisma.walletPass.update.mockResolvedValue({
        id: "wp1",
        serialNumber: "PASS-ABC",
        status: "voided",
      });

      const result = await voidWalletPass("PASS-ABC");

      expect(result.status).toBe("voided");
    });

    it("throws when pass not found", async () => {
      mockPrisma.walletPass.findUnique.mockResolvedValue(null);

      await expect(voidWalletPass("PASS-NONEXISTENT")).rejects.toThrow(
        "Wallet pass not found",
      );
    });

    it("throws when pass is already voided", async () => {
      mockPrisma.walletPass.findUnique.mockResolvedValue({
        id: "wp1",
        serialNumber: "PASS-ABC",
        status: "voided",
      });

      await expect(voidWalletPass("PASS-ABC")).rejects.toThrow(
        "Pass is already voided",
      );
    });
  });

  describe("updatePassStatus", () => {
    it("updates pass status to expired", async () => {
      mockPrisma.walletPass.findUnique.mockResolvedValue({
        id: "wp1",
        serialNumber: "PASS-ABC",
        status: "active",
      });
      mockPrisma.walletPass.update.mockResolvedValue({
        id: "wp1",
        serialNumber: "PASS-ABC",
        status: "expired",
      });

      const result = await updatePassStatus("PASS-ABC", "expired");

      expect(result.status).toBe("expired");
    });

    it("throws for invalid status", async () => {
      await expect(
        updatePassStatus("PASS-ABC", "invalid_status"),
      ).rejects.toThrow("Invalid status: invalid_status");
    });

    it("throws when pass not found", async () => {
      mockPrisma.walletPass.findUnique.mockResolvedValue(null);

      await expect(updatePassStatus("PASS-NONEXISTENT", "active")).rejects.toThrow(
        "Wallet pass not found",
      );
    });
  });

  describe("generateApplePassPayload", () => {
    it("creates valid Apple PKPass structure", () => {
      const payload = generateApplePassPayload(
        { id: "ticket1", purchasedAt: new Date() },
        { id: "e1", title: "Comedy Night", date: new Date("2026-03-20"), showtime: "8:00 PM" },
        { name: "Laugh Factory", city: "Chicago", state: "IL", address: "123 Comedy St" },
      );

      expect(payload.formatVersion).toBe(1);
      expect(payload.passTypeIdentifier).toBe("pass.com.punchlineatlas.ticket");
      expect(payload.organizationName).toBe("Punchline Atlas");
      expect(payload.eventTicket.primaryFields[0].value).toBe("Comedy Night");
      expect(payload.eventTicket.secondaryFields[1].value).toBe("8:00 PM");
      expect(payload.eventTicket.auxiliaryFields[0].value).toBe("Laugh Factory");
      expect(payload.barcode.format).toBe("PKBarcodeFormatQR");
      expect(payload.barcode.message).toBe("ticket1");
    });

    it("handles missing optional fields", () => {
      const payload = generateApplePassPayload(
        { id: "ticket2" },
        { id: "e2", date: new Date("2026-04-01") },
        { name: "Club B", city: "LA", state: "CA" },
      );

      expect(payload.eventTicket.primaryFields[0].value).toBe("Comedy Show");
      expect(payload.eventTicket.secondaryFields[1].value).toBe("TBD");
      expect(payload.eventTicket.backFields[0].value).toBe("LA, CA");
    });
  });

  describe("generateGooglePassPayload", () => {
    it("creates valid Google Pass structure", () => {
      const payload = generateGooglePassPayload(
        { id: "ticket1", purchasedAt: new Date() },
        { id: "e1", title: "Comedy Night", date: new Date("2026-03-20"), showtime: "8:00 PM" },
        { name: "Laugh Factory", city: "Chicago", state: "IL", address: "123 Comedy St" },
      );

      expect(payload.classId).toBe("punchlineatlas.comedy_ticket");
      expect(payload.eventName.defaultValue.value).toBe("Comedy Night");
      expect(payload.venue.name.defaultValue.value).toBe("Laugh Factory");
      expect(payload.venue.address.defaultValue.value).toBe("123 Comedy St");
      expect(payload.ticketNumber).toBe("ticket1");
      expect(payload.barcode.type).toBe("QR_CODE");
      expect(payload.state).toBe("ACTIVE");
    });

    it("uses fallback address when address is missing", () => {
      const payload = generateGooglePassPayload(
        { id: "ticket2" },
        { id: "e2", date: new Date("2026-04-01") },
        { name: "Club B", city: "LA", state: "CA" },
      );

      expect(payload.venue.address.defaultValue.value).toBe("LA, CA");
      expect(payload.eventName.defaultValue.value).toBe("Comedy Show");
    });
  });
});
