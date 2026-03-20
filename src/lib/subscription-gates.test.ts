import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  hasProPlan,
  canUseLocationAlerts,
  canUseCalendarFeed,
  canUseEventReminders,
} from "./subscription-gates";

vi.mock("./prisma", () => ({
  prisma: {
    subscription: {
      findFirst: vi.fn(),
    },
    locationAlert: {
      count: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  subscription: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  locationAlert: {
    count: ReturnType<typeof vi.fn>;
  };
};

describe("subscription-gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("hasProPlan", () => {
    it("returns true for FAN_PRO plan", () => {
      expect(hasProPlan("FAN_PRO")).toBe(true);
    });

    it("returns false for FREE plan", () => {
      expect(hasProPlan("FREE")).toBe(false);
    });

    it("returns false for an empty string", () => {
      expect(hasProPlan("")).toBe(false);
    });

    it("returns false for an arbitrary string", () => {
      expect(hasProPlan("PREMIUM")).toBe(false);
    });
  });

  describe("canUseLocationAlerts", () => {
    const userId = "user-123";

    it("returns true when user has an active FAN_PRO subscription", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({ plan: "FAN_PRO" });

      const result = await canUseLocationAlerts(userId);

      expect(result).toBe(true);
      expect(mockPrisma.subscription.findFirst).toHaveBeenCalledWith({
        where: { userId, status: { in: ["ACTIVE", "TRIALING"] } },
        select: { plan: true },
      });
      // Should not check location alert count for pro users
      expect(mockPrisma.locationAlert.count).not.toHaveBeenCalled();
    });

    it("returns true when user has a trialing FAN_PRO subscription", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({ plan: "FAN_PRO" });

      const result = await canUseLocationAlerts(userId);

      expect(result).toBe(true);
    });

    it("returns true for free user with zero location alerts", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);
      mockPrisma.locationAlert.count.mockResolvedValue(0);

      const result = await canUseLocationAlerts(userId);

      expect(result).toBe(true);
      expect(mockPrisma.locationAlert.count).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it("returns false for free user who already has one location alert", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);
      mockPrisma.locationAlert.count.mockResolvedValue(1);

      const result = await canUseLocationAlerts(userId);

      expect(result).toBe(false);
    });

    it("returns false for free user who has multiple location alerts", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);
      mockPrisma.locationAlert.count.mockResolvedValue(5);

      const result = await canUseLocationAlerts(userId);

      expect(result).toBe(false);
    });

    it("returns false for user with a non-pro active subscription and existing alert", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({ plan: "FREE" });
      mockPrisma.locationAlert.count.mockResolvedValue(1);

      const result = await canUseLocationAlerts(userId);

      expect(result).toBe(false);
    });

    it("falls back to count check when subscription has a non-pro plan", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({ plan: "BASIC" });
      mockPrisma.locationAlert.count.mockResolvedValue(0);

      const result = await canUseLocationAlerts(userId);

      expect(result).toBe(true);
      expect(mockPrisma.locationAlert.count).toHaveBeenCalled();
    });
  });

  describe("canUseCalendarFeed", () => {
    const userId = "user-456";

    it("returns true when user has an active FAN_PRO subscription", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({ plan: "FAN_PRO" });

      const result = await canUseCalendarFeed(userId);

      expect(result).toBe(true);
      expect(mockPrisma.subscription.findFirst).toHaveBeenCalledWith({
        where: { userId, status: { in: ["ACTIVE", "TRIALING"] } },
        select: { plan: true },
      });
    });

    it("returns false when user has no subscription", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);

      const result = await canUseCalendarFeed(userId);

      expect(result).toBe(false);
    });

    it("returns false when user has a non-pro subscription", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({ plan: "FREE" });

      const result = await canUseCalendarFeed(userId);

      expect(result).toBe(false);
    });
  });

  describe("canUseEventReminders", () => {
    const userId = "user-789";

    it("returns true when user has an active FAN_PRO subscription", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({ plan: "FAN_PRO" });

      const result = await canUseEventReminders(userId);

      expect(result).toBe(true);
    });

    it("returns true when user has no subscription (default allowed)", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);

      const result = await canUseEventReminders(userId);

      expect(result).toBe(true);
    });

    it("returns true when user has a non-pro subscription (default allowed)", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({ plan: "FREE" });

      const result = await canUseEventReminders(userId);

      expect(result).toBe(true);
    });
  });
});
