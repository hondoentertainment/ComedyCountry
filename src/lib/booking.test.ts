import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createBookingRequest,
  getBookingRequestsForComedian,
  getBookingRequestsForVenue,
  getBookingRequest,
  respondToBooking,
  negotiateBooking,
  getComedianAvailability,
  getBookingStats,
} from "./booking";

vi.mock("./prisma", () => ({
  prisma: {
    comedian: {
      findUnique: vi.fn(),
    },
    bookingRequest: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    event: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  comedian: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  bookingRequest: {
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  event: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("booking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── createBookingRequest ────────────────────────────────────────────────

  describe("createBookingRequest", () => {
    const baseInput = {
      venueId: "venue-1",
      comedianId: "comedian-1",
      requesterId: "user-1",
      date: new Date("2026-04-15T20:00:00Z"),
    };

    it("creates a booking request successfully", async () => {
      mockPrisma.comedian.findUnique.mockResolvedValue({ id: "comedian-1", name: "Test Comic" });
      mockPrisma.bookingRequest.findFirst.mockResolvedValue(null); // no duplicate, no conflict
      const created = {
        id: "booking-1",
        ...baseInput,
        showType: null,
        budget: null,
        message: null,
        status: "PENDING",
        responseNote: null,
        respondedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.bookingRequest.create.mockResolvedValue(created);

      const result = await createBookingRequest(baseInput);

      expect(result).toEqual(created);
      expect(mockPrisma.bookingRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          venueId: "venue-1",
          comedianId: "comedian-1",
          requesterId: "user-1",
          status: "PENDING",
          showType: null,
          message: null,
        }),
      });
    });

    it("creates a booking with optional fields", async () => {
      mockPrisma.comedian.findUnique.mockResolvedValue({ id: "comedian-1" });
      mockPrisma.bookingRequest.findFirst.mockResolvedValue(null);
      mockPrisma.bookingRequest.create.mockResolvedValue({ id: "booking-2", status: "PENDING" });

      await createBookingRequest({
        ...baseInput,
        showType: "Headliner",
        budget: 500,
        message: "We love your work!",
      });

      expect(mockPrisma.bookingRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          showType: "Headliner",
          message: "We love your work!",
        }),
      });
    });

    it("throws if comedian does not exist", async () => {
      mockPrisma.comedian.findUnique.mockResolvedValue(null);

      await expect(createBookingRequest(baseInput)).rejects.toThrow("Comedian not found");
    });

    it("throws if a duplicate pending request exists", async () => {
      mockPrisma.comedian.findUnique.mockResolvedValue({ id: "comedian-1" });
      // First findFirst call: duplicate check returns existing
      mockPrisma.bookingRequest.findFirst.mockResolvedValueOnce({ id: "existing-1" });

      await expect(createBookingRequest(baseInput)).rejects.toThrow(
        "A booking request already exists for this comedian on this date"
      );
    });

    it("throws if comedian has a confirmed booking on the same date", async () => {
      mockPrisma.comedian.findUnique.mockResolvedValue({ id: "comedian-1" });
      // First findFirst: no duplicate
      mockPrisma.bookingRequest.findFirst.mockResolvedValueOnce(null);
      // Second findFirst: confirmed conflict
      mockPrisma.bookingRequest.findFirst.mockResolvedValueOnce({ id: "conflict-1", status: "CONFIRMED" });

      await expect(createBookingRequest(baseInput)).rejects.toThrow(
        "Comedian already has a confirmed booking on this date"
      );
    });
  });

  // ── getBookingRequestsForComedian ───────────────────────────────────────

  describe("getBookingRequestsForComedian", () => {
    it("returns all bookings for a comedian", async () => {
      const bookings = [{ id: "b1" }, { id: "b2" }];
      mockPrisma.bookingRequest.findMany.mockResolvedValue(bookings);

      const result = await getBookingRequestsForComedian("comedian-1");

      expect(result).toEqual(bookings);
      expect(mockPrisma.bookingRequest.findMany).toHaveBeenCalledWith({
        where: { comedianId: "comedian-1" },
        orderBy: { createdAt: "desc" },
        include: {
          comedian: {
            select: { id: true, name: true, slug: true, headshotUrl: true },
          },
        },
      });
    });

    it("filters by status when provided", async () => {
      mockPrisma.bookingRequest.findMany.mockResolvedValue([]);

      await getBookingRequestsForComedian("comedian-1", "PENDING");

      expect(mockPrisma.bookingRequest.findMany).toHaveBeenCalledWith({
        where: { comedianId: "comedian-1", status: "PENDING" },
        orderBy: { createdAt: "desc" },
        include: expect.any(Object),
      });
    });
  });

  // ── getBookingRequestsForVenue ──────────────────────────────────────────

  describe("getBookingRequestsForVenue", () => {
    it("returns all bookings for a venue", async () => {
      const bookings = [{ id: "b1" }];
      mockPrisma.bookingRequest.findMany.mockResolvedValue(bookings);

      const result = await getBookingRequestsForVenue("venue-1");

      expect(result).toEqual(bookings);
      expect(mockPrisma.bookingRequest.findMany).toHaveBeenCalledWith({
        where: { venueId: "venue-1" },
        orderBy: { createdAt: "desc" },
        include: {
          comedian: {
            select: { id: true, name: true, slug: true, headshotUrl: true },
          },
        },
      });
    });

    it("filters by status when provided", async () => {
      mockPrisma.bookingRequest.findMany.mockResolvedValue([]);

      await getBookingRequestsForVenue("venue-1", "CONFIRMED");

      expect(mockPrisma.bookingRequest.findMany).toHaveBeenCalledWith({
        where: { venueId: "venue-1", status: "CONFIRMED" },
        orderBy: { createdAt: "desc" },
        include: expect.any(Object),
      });
    });
  });

  // ── getBookingRequest ───────────────────────────────────────────────────

  describe("getBookingRequest", () => {
    it("returns a booking by id", async () => {
      const booking = { id: "b1", status: "PENDING" };
      mockPrisma.bookingRequest.findUnique.mockResolvedValue(booking);

      const result = await getBookingRequest("b1");

      expect(result).toEqual(booking);
      expect(mockPrisma.bookingRequest.findUnique).toHaveBeenCalledWith({
        where: { id: "b1" },
        include: {
          comedian: {
            select: { id: true, name: true, slug: true, headshotUrl: true },
          },
        },
      });
    });

    it("returns null when booking does not exist", async () => {
      mockPrisma.bookingRequest.findUnique.mockResolvedValue(null);

      const result = await getBookingRequest("nonexistent");

      expect(result).toBeNull();
    });
  });

  // ── respondToBooking ────────────────────────────────────────────────────

  describe("respondToBooking", () => {
    it("transitions PENDING to ACCEPTED", async () => {
      mockPrisma.bookingRequest.findUnique.mockResolvedValue({
        id: "b1",
        status: "PENDING",
        comedianId: "c1",
        date: new Date("2026-04-15"),
        responseNote: null,
      });
      mockPrisma.bookingRequest.update.mockResolvedValue({ id: "b1", status: "ACCEPTED" });

      const result = await respondToBooking("b1", "ACCEPTED", "Looks good!");

      expect(result.status).toBe("ACCEPTED");
      expect(mockPrisma.bookingRequest.update).toHaveBeenCalledWith({
        where: { id: "b1" },
        data: expect.objectContaining({
          status: "ACCEPTED",
          responseNote: "Looks good!",
        }),
      });
    });

    it("transitions ACCEPTED to CONFIRMED with conflict check", async () => {
      mockPrisma.bookingRequest.findUnique.mockResolvedValue({
        id: "b1",
        status: "ACCEPTED",
        comedianId: "c1",
        date: new Date("2026-04-15"),
        responseNote: null,
      });
      // No conflict
      mockPrisma.bookingRequest.findFirst.mockResolvedValue(null);
      mockPrisma.bookingRequest.update.mockResolvedValue({ id: "b1", status: "CONFIRMED" });

      const result = await respondToBooking("b1", "CONFIRMED");

      expect(result.status).toBe("CONFIRMED");
      expect(mockPrisma.bookingRequest.findFirst).toHaveBeenCalled();
    });

    it("throws on invalid status transition", async () => {
      mockPrisma.bookingRequest.findUnique.mockResolvedValue({
        id: "b1",
        status: "DECLINED",
        comedianId: "c1",
        date: new Date("2026-04-15"),
      });

      await expect(respondToBooking("b1", "CONFIRMED")).rejects.toThrow(
        "Cannot transition from DECLINED to CONFIRMED. Allowed: none"
      );
    });

    it("throws when booking not found", async () => {
      mockPrisma.bookingRequest.findUnique.mockResolvedValue(null);

      await expect(respondToBooking("nonexistent", "ACCEPTED")).rejects.toThrow(
        "Booking request not found"
      );
    });

    it("throws when confirming with a date conflict", async () => {
      mockPrisma.bookingRequest.findUnique.mockResolvedValue({
        id: "b1",
        status: "ACCEPTED",
        comedianId: "c1",
        date: new Date("2026-04-15"),
        responseNote: null,
      });
      mockPrisma.bookingRequest.findFirst.mockResolvedValue({ id: "b2", status: "CONFIRMED" });

      await expect(respondToBooking("b1", "CONFIRMED")).rejects.toThrow(
        "Comedian already has a confirmed booking on this date"
      );
    });

    it("preserves existing responseNote when none provided", async () => {
      mockPrisma.bookingRequest.findUnique.mockResolvedValue({
        id: "b1",
        status: "PENDING",
        comedianId: "c1",
        date: new Date("2026-04-15"),
        responseNote: "Previous note",
      });
      mockPrisma.bookingRequest.update.mockResolvedValue({ id: "b1", status: "DECLINED" });

      await respondToBooking("b1", "DECLINED");

      expect(mockPrisma.bookingRequest.update).toHaveBeenCalledWith({
        where: { id: "b1" },
        data: expect.objectContaining({
          responseNote: "Previous note",
        }),
      });
    });
  });

  // ── negotiateBooking ────────────────────────────────────────────────────

  describe("negotiateBooking", () => {
    it("updates budget and message for a PENDING booking", async () => {
      mockPrisma.bookingRequest.findUnique.mockResolvedValue({
        id: "b1",
        status: "PENDING",
        budget: null,
        message: "Original message",
        responseNote: null,
      });
      mockPrisma.bookingRequest.update.mockResolvedValue({
        id: "b1",
        status: "NEGOTIATING",
      });

      const result = await negotiateBooking("b1", { budget: 750, message: "Can we do 750?" });

      expect(result.status).toBe("NEGOTIATING");
      expect(mockPrisma.bookingRequest.update).toHaveBeenCalledWith({
        where: { id: "b1" },
        data: expect.objectContaining({
          status: "NEGOTIATING",
          message: "Can we do 750?",
        }),
      });
    });

    it("works for a NEGOTIATING booking", async () => {
      mockPrisma.bookingRequest.findUnique.mockResolvedValue({
        id: "b1",
        status: "NEGOTIATING",
        budget: 500,
        message: "Old msg",
        responseNote: "Old note",
      });
      mockPrisma.bookingRequest.update.mockResolvedValue({ id: "b1", status: "NEGOTIATING" });

      await negotiateBooking("b1", { responseNote: "Counter offer" });

      expect(mockPrisma.bookingRequest.update).toHaveBeenCalledWith({
        where: { id: "b1" },
        data: expect.objectContaining({
          status: "NEGOTIATING",
          responseNote: "Counter offer",
          message: "Old msg",
        }),
      });
    });

    it("throws when booking not found", async () => {
      mockPrisma.bookingRequest.findUnique.mockResolvedValue(null);

      await expect(negotiateBooking("nonexistent", { budget: 100 })).rejects.toThrow(
        "Booking request not found"
      );
    });

    it("throws when booking is not in a negotiable state", async () => {
      mockPrisma.bookingRequest.findUnique.mockResolvedValue({
        id: "b1",
        status: "CONFIRMED",
      });

      await expect(negotiateBooking("b1", { budget: 100 })).rejects.toThrow(
        "Booking is not in a negotiable state"
      );
    });
  });

  // ── getComedianAvailability ─────────────────────────────────────────────

  describe("getComedianAvailability", () => {
    it("returns a full month calendar with correct statuses", async () => {
      // March 2026 has 31 days
      mockPrisma.bookingRequest.findMany.mockResolvedValue([
        { date: new Date("2026-03-05T20:00:00Z"), status: "CONFIRMED" },
        { date: new Date("2026-03-10T19:00:00Z"), status: "PENDING" },
      ]);
      mockPrisma.event.findMany.mockResolvedValue([
        { date: new Date("2026-03-20T21:00:00Z") },
      ]);

      const result = await getComedianAvailability("c1", 3, 2026);

      expect(result).toHaveLength(31);
      expect(result.find((d) => d.date === "2026-03-05")?.status).toBe("booked");
      expect(result.find((d) => d.date === "2026-03-10")?.status).toBe("pending");
      expect(result.find((d) => d.date === "2026-03-20")?.status).toBe("booked");
      expect(result.find((d) => d.date === "2026-03-01")?.status).toBe("available");
    });

    it("events override pending bookings", async () => {
      mockPrisma.bookingRequest.findMany.mockResolvedValue([
        { date: new Date("2026-03-15T20:00:00Z"), status: "PENDING" },
      ]);
      mockPrisma.event.findMany.mockResolvedValue([
        { date: new Date("2026-03-15T21:00:00Z") },
      ]);

      const result = await getComedianAvailability("c1", 3, 2026);

      expect(result.find((d) => d.date === "2026-03-15")?.status).toBe("booked");
    });

    it("returns all available when no bookings or events", async () => {
      mockPrisma.bookingRequest.findMany.mockResolvedValue([]);
      mockPrisma.event.findMany.mockResolvedValue([]);

      const result = await getComedianAvailability("c1", 2, 2026);

      expect(result).toHaveLength(28); // Feb 2026
      expect(result.every((d) => d.status === "available")).toBe(true);
    });
  });

  // ── getBookingStats ─────────────────────────────────────────────────────

  describe("getBookingStats", () => {
    it("returns correct stats and acceptance rate", async () => {
      mockPrisma.bookingRequest.count
        .mockResolvedValueOnce(10)  // total
        .mockResolvedValueOnce(3)   // pending
        .mockResolvedValueOnce(5)   // confirmed
        .mockResolvedValueOnce(1)   // declined
        .mockResolvedValueOnce(1);  // cancelled

      const result = await getBookingStats("c1");

      expect(result).toEqual({
        total: 10,
        pending: 3,
        confirmed: 5,
        declined: 1,
        cancelled: 1,
        acceptanceRate: 50,
      });
    });

    it("returns 0 acceptance rate when no bookings", async () => {
      mockPrisma.bookingRequest.count.mockResolvedValue(0);

      const result = await getBookingStats("c1");

      expect(result).toEqual({
        total: 0,
        pending: 0,
        confirmed: 0,
        declined: 0,
        cancelled: 0,
        acceptanceRate: 0,
      });
    });
  });
});
