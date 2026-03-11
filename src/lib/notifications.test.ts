import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateEventNotifications, getUnreadCount } from "./notifications";

vi.mock("./prisma", () => ({
  prisma: {
    comedianFollow: { findMany: vi.fn() },
    venueFollow: { findMany: vi.fn() },
    notificationPreference: { findMany: vi.fn() },
    notification: { createMany: vi.fn(), count: vi.fn() },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  comedianFollow: { findMany: ReturnType<typeof vi.fn> };
  venueFollow: { findMany: ReturnType<typeof vi.fn> };
  notificationPreference: { findMany: ReturnType<typeof vi.fn> };
  notification: {
    createMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

const makeEvent = (overrides = {}) => ({
  id: "event-1",
  title: "Comedy Night",
  venueId: "venue-1",
  venue: { name: "The Laugh Factory", city: "Los Angeles", state: "CA" },
  comedians: [{ comedian: { id: "c-1", name: "Dave Chappelle" } }],
  date: new Date("2026-04-15"),
  ...overrides,
});

describe("notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateEventNotifications", () => {
    it("creates notifications for comedian and venue followers", async () => {
      mockPrisma.comedianFollow.findMany.mockResolvedValue([
        { userId: "user-1" },
        { userId: "user-2" },
      ]);
      mockPrisma.venueFollow.findMany.mockResolvedValue([
        { userId: "user-2" },
        { userId: "user-3" },
      ]);
      mockPrisma.notificationPreference.findMany.mockResolvedValue([]);
      mockPrisma.notification.createMany.mockResolvedValue({ count: 3 });

      const count = await generateEventNotifications(makeEvent());

      expect(count).toBe(3); // user-1, user-2, user-3 (deduplicated)
      expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: "user-1",
            type: "new_event",
            eventId: "event-1",
          }),
        ]),
      });
    });

    it("deduplicates users who follow both comedian and venue", async () => {
      mockPrisma.comedianFollow.findMany.mockResolvedValue([
        { userId: "user-1" },
      ]);
      mockPrisma.venueFollow.findMany.mockResolvedValue([
        { userId: "user-1" },
      ]);
      mockPrisma.notificationPreference.findMany.mockResolvedValue([]);
      mockPrisma.notification.createMany.mockResolvedValue({ count: 1 });

      const count = await generateEventNotifications(makeEvent());

      expect(count).toBe(1);
      const createCall = mockPrisma.notification.createMany.mock.calls[0][0];
      expect(createCall.data).toHaveLength(1);
    });

    it("excludes users who disabled in-app notifications", async () => {
      mockPrisma.comedianFollow.findMany.mockResolvedValue([
        { userId: "user-1" },
        { userId: "user-2" },
      ]);
      mockPrisma.venueFollow.findMany.mockResolvedValue([]);
      // user-2 has disabled in-app notifications
      mockPrisma.notificationPreference.findMany.mockResolvedValue([
        { userId: "user-2" },
      ]);
      mockPrisma.notification.createMany.mockResolvedValue({ count: 1 });

      const count = await generateEventNotifications(makeEvent());

      expect(count).toBe(1);
    });

    it("returns 0 when no followers exist", async () => {
      mockPrisma.comedianFollow.findMany.mockResolvedValue([]);
      mockPrisma.venueFollow.findMany.mockResolvedValue([]);

      const count = await generateEventNotifications(makeEvent());

      expect(count).toBe(0);
      expect(mockPrisma.notification.createMany).not.toHaveBeenCalled();
    });

    it("returns 0 when all followers have notifications disabled", async () => {
      mockPrisma.comedianFollow.findMany.mockResolvedValue([
        { userId: "user-1" },
      ]);
      mockPrisma.venueFollow.findMany.mockResolvedValue([]);
      mockPrisma.notificationPreference.findMany.mockResolvedValue([
        { userId: "user-1" },
      ]);

      const count = await generateEventNotifications(makeEvent());

      expect(count).toBe(0);
      expect(mockPrisma.notification.createMany).not.toHaveBeenCalled();
    });

    it("uses event title in notification message", async () => {
      mockPrisma.comedianFollow.findMany.mockResolvedValue([
        { userId: "user-1" },
      ]);
      mockPrisma.venueFollow.findMany.mockResolvedValue([]);
      mockPrisma.notificationPreference.findMany.mockResolvedValue([]);
      mockPrisma.notification.createMany.mockResolvedValue({ count: 1 });

      await generateEventNotifications(makeEvent({ title: "Special Show" }));

      const createCall = mockPrisma.notification.createMany.mock.calls[0][0];
      expect(createCall.data[0].title).toBe("Special Show");
      expect(createCall.data[0].message).toContain("Special Show");
      expect(createCall.data[0].message).toContain("The Laugh Factory");
    });

    it("falls back to comedian names when no title", async () => {
      mockPrisma.comedianFollow.findMany.mockResolvedValue([
        { userId: "user-1" },
      ]);
      mockPrisma.venueFollow.findMany.mockResolvedValue([]);
      mockPrisma.notificationPreference.findMany.mockResolvedValue([]);
      mockPrisma.notification.createMany.mockResolvedValue({ count: 1 });

      await generateEventNotifications(makeEvent({ title: null }));

      const createCall = mockPrisma.notification.createMany.mock.calls[0][0];
      expect(createCall.data[0].title).toBe("Dave Chappelle");
    });

    it("handles events with no comedians", async () => {
      mockPrisma.comedianFollow.findMany.mockResolvedValue([]);
      mockPrisma.venueFollow.findMany.mockResolvedValue([
        { userId: "user-1" },
      ]);
      mockPrisma.notificationPreference.findMany.mockResolvedValue([]);
      mockPrisma.notification.createMany.mockResolvedValue({ count: 1 });

      await generateEventNotifications(
        makeEvent({ title: null, comedians: [] })
      );

      const createCall = mockPrisma.notification.createMany.mock.calls[0][0];
      expect(createCall.data[0].title).toBe("New Show");
    });
  });

  describe("getUnreadCount", () => {
    it("returns count of unread notifications", async () => {
      mockPrisma.notification.count.mockResolvedValue(5);

      const count = await getUnreadCount("user-1");

      expect(count).toBe(5);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: "user-1", read: false },
      });
    });

    it("returns 0 when no unread notifications", async () => {
      mockPrisma.notification.count.mockResolvedValue(0);

      const count = await getUnreadCount("user-1");

      expect(count).toBe(0);
    });
  });
});
