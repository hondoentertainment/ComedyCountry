import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createCalendarSync,
  listCalendarSyncs,
  deleteCalendarSync,
  deactivateCalendarSync,
  generateICalEvent,
  generateUserCalendarFeed,
  syncToProvider,
} from "./calendar-sync";

vi.mock("./prisma", () => ({
  prisma: {
    calendarSync: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    ticket: {
      findMany: vi.fn(),
    },
    eventAttendance: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  calendarSync: {
    upsert: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  ticket: {
    findMany: ReturnType<typeof vi.fn>;
  };
  eventAttendance: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe("calendar-sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createCalendarSync", () => {
    it("creates a sync for a valid provider", async () => {
      const syncRecord = {
        id: "cs1",
        userId: "u1",
        provider: "google",
        isActive: true,
      };
      mockPrisma.calendarSync.upsert.mockResolvedValue(syncRecord);

      const result = await createCalendarSync("u1", "google", {
        accessToken: "tok",
      });
      expect(result).toEqual(syncRecord);
      expect(mockPrisma.calendarSync.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_provider: { userId: "u1", provider: "google" } },
        })
      );
    });

    it("throws for invalid provider", async () => {
      await expect(createCalendarSync("u1", "yahoo")).rejects.toThrow(
        'Invalid provider "yahoo"'
      );
    });
  });

  describe("listCalendarSyncs", () => {
    it("returns syncs for a user", async () => {
      const syncs = [
        { id: "cs1", provider: "google" },
        { id: "cs2", provider: "apple" },
      ];
      mockPrisma.calendarSync.findMany.mockResolvedValue(syncs);

      const result = await listCalendarSyncs("u1");
      expect(result).toEqual(syncs);
      expect(mockPrisma.calendarSync.findMany).toHaveBeenCalledWith({
        where: { userId: "u1" },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("deleteCalendarSync", () => {
    it("deletes a sync owned by the user", async () => {
      mockPrisma.calendarSync.findUnique.mockResolvedValue({
        id: "cs1",
        userId: "u1",
      });
      mockPrisma.calendarSync.delete.mockResolvedValue({ id: "cs1" });

      const result = await deleteCalendarSync("u1", "cs1");
      expect(result).toEqual({ id: "cs1" });
    });

    it("throws if sync not found", async () => {
      mockPrisma.calendarSync.findUnique.mockResolvedValue(null);
      await expect(deleteCalendarSync("u1", "bogus")).rejects.toThrow(
        "Calendar sync not found"
      );
    });

    it("throws if not owned by user", async () => {
      mockPrisma.calendarSync.findUnique.mockResolvedValue({
        id: "cs1",
        userId: "other",
      });
      await expect(deleteCalendarSync("u1", "cs1")).rejects.toThrow(
        "Not your calendar sync"
      );
    });
  });

  describe("deactivateCalendarSync", () => {
    it("deactivates a sync owned by the user", async () => {
      mockPrisma.calendarSync.findUnique.mockResolvedValue({
        id: "cs1",
        userId: "u1",
      });
      mockPrisma.calendarSync.update.mockResolvedValue({
        id: "cs1",
        isActive: false,
      });

      const result = await deactivateCalendarSync("u1", "cs1");
      expect(result.isActive).toBe(false);
    });
  });

  describe("generateICalEvent", () => {
    it("generates valid iCal VEVENT", () => {
      const event = {
        id: "evt1",
        title: "Dave Chappelle Live",
        date: new Date("2026-07-15T20:00:00Z"),
        showtime: "8:00 PM",
        venue: { name: "The Comedy Store", address: "8433 Sunset Blvd" },
      };

      const ical = generateICalEvent(event);
      expect(ical).toContain("BEGIN:VEVENT");
      expect(ical).toContain("END:VEVENT");
      expect(ical).toContain("UID:evt1@comedycountry.com");
      expect(ical).toContain("SUMMARY:Dave Chappelle Live");
      expect(ical).toContain("LOCATION:The Comedy Store\\, 8433 Sunset Blvd");
      expect(ical).toContain("DESCRIPTION:Showtime: 8:00 PM");
    });

    it("handles events without showtime or address", () => {
      const event = {
        id: "evt2",
        title: "Open Mic Night",
        date: new Date("2026-08-01T19:00:00Z"),
        venue: { name: "Laugh Factory" },
      };

      const ical = generateICalEvent(event);
      expect(ical).toContain("SUMMARY:Open Mic Night");
      expect(ical).toContain("LOCATION:Laugh Factory");
      expect(ical).not.toContain("DESCRIPTION:");
    });

    it("uses description when provided", () => {
      const event = {
        id: "evt3",
        title: "Special Show",
        date: new Date("2026-09-01T21:00:00Z"),
        venue: { name: "Club" },
        description: "Featuring: Ali Wong, John Mulaney",
      };

      const ical = generateICalEvent(event);
      expect(ical).toContain(
        "DESCRIPTION:Featuring: Ali Wong\\, John Mulaney"
      );
    });
  });

  describe("generateUserCalendarFeed", () => {
    it("generates iCal feed from tickets and attendances", async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([
        {
          event: {
            id: "e1",
            title: "Show A",
            date: new Date("2026-08-01T20:00:00Z"),
            showtime: "8 PM",
            venue: { name: "Venue A" },
            comedians: [{ comedian: { name: "Comic A" } }],
          },
        },
      ]);

      mockPrisma.eventAttendance.findMany.mockResolvedValue([
        {
          event: {
            id: "e2",
            title: null,
            date: new Date("2026-08-05T19:00:00Z"),
            showtime: null,
            venue: { name: "Venue B" },
            comedians: [{ comedian: { name: "Comic B" } }],
          },
        },
      ]);

      const feed = await generateUserCalendarFeed("u1");
      expect(feed).toContain("BEGIN:VCALENDAR");
      expect(feed).toContain("END:VCALENDAR");
      expect(feed).toContain("SUMMARY:Show A");
      expect(feed).toContain("SUMMARY:Comic B"); // falls back to comedian name
      expect(feed).toContain("X-WR-CALNAME:My Comedy Shows");
    });

    it("deduplicates events appearing in both tickets and attendance", async () => {
      const sharedEvent = {
        id: "e1",
        title: "Shared Show",
        date: new Date("2026-08-01T20:00:00Z"),
        showtime: null,
        venue: { name: "Venue" },
        comedians: [],
      };

      mockPrisma.ticket.findMany.mockResolvedValue([
        { event: sharedEvent },
      ]);
      mockPrisma.eventAttendance.findMany.mockResolvedValue([
        { event: sharedEvent },
      ]);

      const feed = await generateUserCalendarFeed("u1");
      const eventCount = (feed.match(/BEGIN:VEVENT/g) || []).length;
      expect(eventCount).toBe(1);
    });
  });

  describe("syncToProvider", () => {
    it("syncs and updates lastSyncAt", async () => {
      mockPrisma.calendarSync.findUnique.mockResolvedValue({
        id: "cs1",
        userId: "u1",
        provider: "google",
        isActive: true,
      });

      mockPrisma.ticket.findMany.mockResolvedValue([]);
      mockPrisma.eventAttendance.findMany.mockResolvedValue([]);
      mockPrisma.calendarSync.update.mockResolvedValue({});

      const result = await syncToProvider("u1", "cs1");
      expect(result.provider).toBe("google");
      expect(result.eventCount).toBe(0);
      expect(mockPrisma.calendarSync.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "cs1" },
          data: { lastSyncAt: expect.any(Date) },
        })
      );
    });

    it("throws if sync is not active", async () => {
      mockPrisma.calendarSync.findUnique.mockResolvedValue({
        id: "cs1",
        userId: "u1",
        provider: "google",
        isActive: false,
      });

      await expect(syncToProvider("u1", "cs1")).rejects.toThrow(
        "Calendar sync is not active"
      );
    });

    it("throws if not owned by user", async () => {
      mockPrisma.calendarSync.findUnique.mockResolvedValue({
        id: "cs1",
        userId: "other",
        provider: "google",
        isActive: true,
      });

      await expect(syncToProvider("u1", "cs1")).rejects.toThrow(
        "Not your calendar sync"
      );
    });
  });
});
