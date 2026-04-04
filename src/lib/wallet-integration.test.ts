import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateAppleWalletPassJSON,
  generateGoogleWalletPassJWT,
  signGoogleWalletJWT,
  updatePassesForEvent,
  generatePassDownloadURL,
  batchGeneratePassesForEvent,
} from "./wallet-integration";

vi.mock("./prisma", () => ({
  prisma: {
    walletPass: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    ticket: {
      findMany: vi.fn(),
    },
    event: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  walletPass: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  ticket: {
    findMany: ReturnType<typeof vi.fn>;
  };
  event: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  user: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

const mockTicket = {
  id: "ticket1",
  userId: "user1",
  purchasedAt: new Date("2026-01-15"),
  seatNumber: null as string | null,
  seatSection: null as string | null,
};

const mockEvent = {
  id: "event1",
  title: "Comedy Night Live",
  date: new Date("2026-04-15T20:00:00Z"),
  endDate: null as Date | null,
  showtime: "8:00 PM",
};

const mockVenue = {
  name: "The Laugh Factory",
  city: "Chicago",
  state: "IL",
  address: "123 Comedy Blvd",
  latitude: 41.8781,
  longitude: -87.6298,
};

describe("wallet-integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateAppleWalletPassJSON", () => {
    it("generates a valid Apple PKPass JSON structure", () => {
      const pass = generateAppleWalletPassJSON(
        mockTicket,
        mockEvent,
        mockVenue,
      );

      expect(pass.formatVersion).toBe(1);
      expect(pass.passTypeIdentifier).toBe("pass.com.punchlineatlas.ticket");
      expect(pass.teamIdentifier).toBe("PUNCHLINE");
      expect(pass.organizationName).toBe("Punchline Atlas");
      expect(pass.serialNumber).toBe("APPLE-ticket1");
      expect(pass.description).toBe("Ticket: Comedy Night Live");
      expect(pass.relevantDate).toBe(mockEvent.date.toISOString());
      expect(pass.logoText).toBe("Punchline Atlas");
    });

    it("includes event ticket fields", () => {
      const pass = generateAppleWalletPassJSON(
        mockTicket,
        mockEvent,
        mockVenue,
      );

      expect(pass.eventTicket.primaryFields[0].value).toBe("Comedy Night Live");
      expect(pass.eventTicket.secondaryFields[1].value).toBe("8:00 PM");
      expect(pass.eventTicket.auxiliaryFields[0].value).toBe(
        "The Laugh Factory",
      );
      expect(pass.eventTicket.auxiliaryFields[1].value).toBe("Chicago, IL");
    });

    it("includes barcode with ticket ID", () => {
      const pass = generateAppleWalletPassJSON(
        mockTicket,
        mockEvent,
        mockVenue,
      );

      expect(pass.barcode.format).toBe("PKBarcodeFormatQR");
      expect(pass.barcode.message).toBe("PUNCHLINE:ticket1");
      expect(pass.barcode.altText).toBe("ticket1");
    });

    it("includes location data when venue has coordinates", () => {
      const pass = generateAppleWalletPassJSON(
        mockTicket,
        mockEvent,
        mockVenue,
      );

      expect(pass.locations).toBeDefined();
      expect(pass.locations).toHaveLength(1);
      expect(pass.locations![0].latitude).toBe(41.8781);
      expect(pass.locations![0].longitude).toBe(-87.6298);
    });

    it("omits location data when venue has no coordinates", () => {
      const venueNoCoords = { ...mockVenue, latitude: null, longitude: null };
      const pass = generateAppleWalletPassJSON(
        mockTicket,
        mockEvent,
        venueNoCoords,
      );

      expect(pass.locations).toBeUndefined();
    });

    it("includes seat info when available", () => {
      const ticketWithSeat = {
        ...mockTicket,
        seatNumber: "A12",
        seatSection: "Floor",
      };
      const pass = generateAppleWalletPassJSON(
        ticketWithSeat,
        mockEvent,
        mockVenue,
      );

      const seatField = pass.eventTicket.auxiliaryFields.find(
        (f) => f.key === "seat",
      );
      expect(seatField).toBeDefined();
      expect(seatField!.value).toBe("Floor - A12");
    });

    it("handles missing optional event fields", () => {
      const minEvent = {
        id: "e2",
        date: new Date("2026-05-01"),
        showtime: null,
        endDate: null,
        title: null,
      };
      const minVenue = {
        name: "Club",
        city: "NYC",
        state: "NY",
        address: null,
        latitude: null,
        longitude: null,
      };
      const pass = generateAppleWalletPassJSON(mockTicket, minEvent, minVenue);

      expect(pass.eventTicket.primaryFields[0].value).toBe("Comedy Show");
      expect(pass.eventTicket.secondaryFields[1].value).toBe("TBD");
      expect(pass.eventTicket.backFields[0].value).toBe("NYC, NY");
    });

    it("sets expiration to day after event when no endDate", () => {
      const pass = generateAppleWalletPassJSON(
        mockTicket,
        mockEvent,
        mockVenue,
      );

      const expiry = new Date(mockEvent.date);
      expiry.setDate(expiry.getDate() + 1);
      expect(pass.expirationDate).toBe(expiry.toISOString());
    });

    it("sets expiration to endDate when available", () => {
      const eventWithEnd = {
        ...mockEvent,
        endDate: new Date("2026-04-16T01:00:00Z"),
      };
      const pass = generateAppleWalletPassJSON(
        mockTicket,
        eventWithEnd,
        mockVenue,
      );

      expect(pass.expirationDate).toBe("2026-04-16T01:00:00.000Z");
    });

    it("includes authentication token", () => {
      const pass = generateAppleWalletPassJSON(
        mockTicket,
        mockEvent,
        mockVenue,
      );

      expect(pass.authenticationToken).toBeDefined();
      expect(typeof pass.authenticationToken).toBe("string");
      expect(pass.authenticationToken!.length).toBeGreaterThan(0);
    });
  });

  describe("generateGoogleWalletPassJWT", () => {
    it("generates a valid Google Wallet JWT structure", () => {
      const jwt = generateGoogleWalletPassJWT(mockTicket, mockEvent, mockVenue);

      expect(jwt.iss).toContain("punchlineatlas");
      expect(jwt.aud).toBe("google");
      expect(jwt.typ).toBe("savetowallet");
      expect(jwt.iat).toBeGreaterThan(0);
      expect(jwt.payload.eventTicketObjects).toHaveLength(1);
    });

    it("includes correct event ticket object", () => {
      const jwt = generateGoogleWalletPassJWT(mockTicket, mockEvent, mockVenue);
      const obj = jwt.payload.eventTicketObjects[0];

      expect(obj.id).toBe("punchlineatlas.ticket.ticket1");
      expect(obj.classId).toBe("punchlineatlas.comedy_ticket");
      expect(obj.state).toBe("ACTIVE");
      expect(obj.ticketNumber).toBe("ticket1");
      expect(obj.eventName.defaultValue.value).toBe("Comedy Night Live");
    });

    it("includes venue info", () => {
      const jwt = generateGoogleWalletPassJWT(mockTicket, mockEvent, mockVenue);
      const obj = jwt.payload.eventTicketObjects[0];

      expect(obj.venue.name.defaultValue.value).toBe("The Laugh Factory");
      expect(obj.venue.address.defaultValue.value).toBe("123 Comedy Blvd");
    });

    it("falls back to city/state when no address", () => {
      const venueNoAddr = { ...mockVenue, address: null };
      const jwt = generateGoogleWalletPassJWT(
        mockTicket,
        mockEvent,
        venueNoAddr,
      );
      const obj = jwt.payload.eventTicketObjects[0];

      expect(obj.venue.address.defaultValue.value).toBe("Chicago, IL");
    });

    it("includes ticket holder name when provided", () => {
      const jwt = generateGoogleWalletPassJWT(
        mockTicket,
        mockEvent,
        mockVenue,
        "John Doe",
      );
      const obj = jwt.payload.eventTicketObjects[0];

      expect(obj.ticketHolderName).toBe("John Doe");
    });

    it("omits ticket holder name when not provided", () => {
      const jwt = generateGoogleWalletPassJWT(mockTicket, mockEvent, mockVenue);
      const obj = jwt.payload.eventTicketObjects[0];

      expect(obj.ticketHolderName).toBeUndefined();
    });

    it("includes seat info when available", () => {
      const ticketWithSeat = {
        ...mockTicket,
        seatNumber: "B7",
        seatSection: "Balcony",
      };
      const jwt = generateGoogleWalletPassJWT(
        ticketWithSeat,
        mockEvent,
        mockVenue,
      );
      const obj = jwt.payload.eventTicketObjects[0];

      expect(obj.seatInfo).toBeDefined();
      expect(obj.seatInfo!.seat.defaultValue.value).toBe("B7");
      expect(obj.seatInfo!.section.defaultValue.value).toBe("Balcony");
    });

    it("uses General for section when seatSection is missing", () => {
      const ticketWithSeat = {
        ...mockTicket,
        seatNumber: "C3",
        seatSection: null,
      };
      const jwt = generateGoogleWalletPassJWT(
        ticketWithSeat,
        mockEvent,
        mockVenue,
      );
      const obj = jwt.payload.eventTicketObjects[0];

      expect(obj.seatInfo!.section.defaultValue.value).toBe("General");
    });

    it("includes barcode with correct format", () => {
      const jwt = generateGoogleWalletPassJWT(mockTicket, mockEvent, mockVenue);
      const obj = jwt.payload.eventTicketObjects[0];

      expect(obj.barcode.type).toBe("QR_CODE");
      expect(obj.barcode.value).toBe("PUNCHLINE:ticket1");
    });
  });

  describe("signGoogleWalletJWT", () => {
    it("returns a valid JWT string with three parts", () => {
      const jwt = generateGoogleWalletPassJWT(mockTicket, mockEvent, mockVenue);
      const signed = signGoogleWalletJWT(jwt);

      const parts = signed.split(".");
      expect(parts).toHaveLength(3);
    });

    it("includes correct header", () => {
      const jwt = generateGoogleWalletPassJWT(mockTicket, mockEvent, mockVenue);
      const signed = signGoogleWalletJWT(jwt);

      const header = JSON.parse(
        Buffer.from(signed.split(".")[0], "base64url").toString(),
      );
      expect(header.alg).toBe("HS256");
      expect(header.typ).toBe("JWT");
    });

    it("includes payload data", () => {
      const jwt = generateGoogleWalletPassJWT(mockTicket, mockEvent, mockVenue);
      const signed = signGoogleWalletJWT(jwt);

      const payload = JSON.parse(
        Buffer.from(signed.split(".")[1], "base64url").toString(),
      );
      expect(payload.aud).toBe("google");
      expect(payload.payload.eventTicketObjects).toHaveLength(1);
    });

    it("produces consistent signatures for same input", () => {
      const jwt = generateGoogleWalletPassJWT(mockTicket, mockEvent, mockVenue);
      const signed1 = signGoogleWalletJWT(jwt);
      const signed2 = signGoogleWalletJWT(jwt);

      expect(signed1).toBe(signed2);
    });
  });

  describe("generatePassDownloadURL", () => {
    it("generates Apple pass URL with .pkpass extension", () => {
      const url = generatePassDownloadURL("PASS-ABC123", "apple");

      expect(url).toContain("apple/PASS-ABC123.pkpass");
      expect(url).toContain("token=");
    });

    it("generates Google pass URL with serial param", () => {
      const url = generatePassDownloadURL("PASS-DEF456", "google");

      expect(url).toContain("google/save");
      expect(url).toContain("serial=PASS-DEF456");
      expect(url).toContain("token=");
    });

    it("generates unique tokens each time", () => {
      const url1 = generatePassDownloadURL("PASS-ABC", "apple");
      const url2 = generatePassDownloadURL("PASS-ABC", "apple");

      // Extract tokens
      const token1 = url1.split("token=")[1];
      const token2 = url2.split("token=")[1];
      expect(token1).not.toBe(token2);
    });
  });

  describe("updatePassesForEvent", () => {
    it("updates all active passes for an event", async () => {
      const mockPass = {
        id: "wp1",
        userId: "user1",
        ticketId: "ticket1",
        platform: "apple",
        status: "active",
        createdAt: new Date(),
      };

      mockPrisma.ticket.findMany.mockResolvedValue([{ id: "ticket1" }]);
      mockPrisma.walletPass.findMany.mockResolvedValue([mockPass]);
      mockPrisma.event.findUnique.mockResolvedValue({
        id: "event1",
        title: "Old Title",
        date: new Date("2026-04-15"),
        showtime: "8:00 PM",
        venue: mockVenue,
      });
      mockPrisma.walletPass.update.mockImplementation(
        async ({ data }: any) => ({
          ...mockPass,
          ...data,
        }),
      );

      const result = await updatePassesForEvent("event1", {
        title: "New Title",
      });

      expect(result.updated).toBe(1);
      expect(result.passes).toHaveLength(1);
      expect(mockPrisma.walletPass.update).toHaveBeenCalledTimes(1);
    });

    it("voids passes when event is cancelled", async () => {
      const mockPass = {
        id: "wp1",
        userId: "user1",
        ticketId: "ticket1",
        platform: "google",
        status: "active",
        createdAt: new Date(),
      };

      mockPrisma.ticket.findMany.mockResolvedValue([{ id: "ticket1" }]);
      mockPrisma.walletPass.findMany.mockResolvedValue([mockPass]);
      mockPrisma.event.findUnique.mockResolvedValue({
        id: "event1",
        title: "Show",
        date: new Date("2026-04-15"),
        showtime: "9:00 PM",
        venue: mockVenue,
      });
      mockPrisma.walletPass.update.mockImplementation(
        async ({ data }: any) => ({
          ...mockPass,
          ...data,
        }),
      );

      const result = await updatePassesForEvent("event1", { cancelled: true });

      expect(result.updated).toBe(1);
      expect(mockPrisma.walletPass.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "voided" }),
        }),
      );
    });

    it("returns zero when no passes exist for the event", async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);
      mockPrisma.walletPass.findMany.mockResolvedValue([]);

      const result = await updatePassesForEvent("event-no-passes", {
        title: "New Title",
      });

      expect(result.updated).toBe(0);
      expect(result.passes).toEqual([]);
    });
  });

  describe("batchGeneratePassesForEvent", () => {
    it("generates passes for all tickets", async () => {
      const tickets = [
        { id: "t1", userId: "u1", eventId: "e1", createdAt: new Date() },
        { id: "t2", userId: "u2", eventId: "e1", createdAt: new Date() },
      ];

      mockPrisma.ticket.findMany.mockResolvedValue(tickets);
      mockPrisma.event.findUnique.mockResolvedValue({
        id: "e1",
        title: "Show",
        date: new Date("2026-05-01"),
        showtime: "7:00 PM",
        venue: mockVenue,
      });
      mockPrisma.walletPass.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ name: "Alice" })
        .mockResolvedValueOnce({ name: "Bob" });
      mockPrisma.walletPass.create.mockImplementation(
        async ({ data }: any) => ({
          id: `wp-${data.ticketId}`,
          ...data,
        }),
      );

      const result = await batchGeneratePassesForEvent("e1", "apple");

      expect(result.generated).toBe(2);
      expect(result.passes).toHaveLength(2);
      expect(mockPrisma.walletPass.create).toHaveBeenCalledTimes(2);
    });

    it("skips tickets that already have passes", async () => {
      const tickets = [
        { id: "t1", userId: "u1", eventId: "e1", createdAt: new Date() },
      ];

      mockPrisma.ticket.findMany.mockResolvedValue(tickets);
      mockPrisma.event.findUnique.mockResolvedValue({
        id: "e1",
        title: "Show",
        date: new Date("2026-05-01"),
        showtime: "7:00 PM",
        venue: mockVenue,
      });
      mockPrisma.walletPass.findFirst.mockResolvedValue({
        id: "existing-pass",
        ticketId: "t1",
        platform: "apple",
        status: "active",
      });

      const result = await batchGeneratePassesForEvent("e1", "apple");

      expect(result.generated).toBe(0);
      expect(mockPrisma.walletPass.create).not.toHaveBeenCalled();
    });

    it("returns empty when no tickets exist", async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);

      const result = await batchGeneratePassesForEvent("no-tickets", "google");

      expect(result.generated).toBe(0);
      expect(result.passes).toEqual([]);
    });
  });
});
