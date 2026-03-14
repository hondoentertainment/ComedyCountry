import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userBadge: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    comedianFollow: { count: vi.fn() },
    venueFollow: { count: vi.fn() },
    eventReview: { count: vi.fn() },
    comedianTierRating: { count: vi.fn() },
    comedyList: { count: vi.fn() },
    eventAttendance: { count: vi.fn() },
    showGroup: { count: vi.fn() },
    user: { findUnique: vi.fn() },
    notification: { create: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { checkAndAwardBadges, getUserBadges, BADGE_DEFINITIONS } from "./badges.achievement";

beforeEach(() => vi.clearAllMocks());

describe("BADGE_DEFINITIONS", () => {
  it("has unique badge IDs", () => {
    const ids = BADGE_DEFINITIONS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("checkAndAwardBadges", () => {
  it("awards first_follow badge", async () => {
    vi.mocked(prisma.userBadge.findMany).mockResolvedValue([]);
    vi.mocked(prisma.comedianFollow.count).mockResolvedValue(1);
    vi.mocked(prisma.userBadge.create).mockResolvedValue({} as never);
    vi.mocked(prisma.notification.create).mockResolvedValue({} as never);

    const awarded = await checkAndAwardBadges("user-1", "follow_comedian");
    expect(awarded).toContain("first_follow");
  });

  it("skips already earned badges", async () => {
    vi.mocked(prisma.userBadge.findMany).mockResolvedValue([
      { badge: "first_follow" },
    ] as never);
    vi.mocked(prisma.comedianFollow.count).mockResolvedValue(3);

    const awarded = await checkAndAwardBadges("user-1", "follow_comedian");
    expect(awarded).not.toContain("first_follow");
  });

  it("awards five_follows at 5+ follows", async () => {
    vi.mocked(prisma.userBadge.findMany).mockResolvedValue([
      { badge: "first_follow" },
    ] as never);
    vi.mocked(prisma.comedianFollow.count).mockResolvedValue(5);
    vi.mocked(prisma.userBadge.create).mockResolvedValue({} as never);
    vi.mocked(prisma.notification.create).mockResolvedValue({} as never);

    const awarded = await checkAndAwardBadges("user-1", "follow_comedian");
    expect(awarded).toContain("five_follows");
  });
});

describe("getUserBadges", () => {
  it("returns earned badges with definitions", async () => {
    vi.mocked(prisma.userBadge.findMany).mockResolvedValue([
      { badge: "first_follow", earnedAt: new Date() },
      { badge: "first_review", earnedAt: new Date() },
    ] as never);

    const badges = await getUserBadges("user-1");
    expect(badges).toHaveLength(2);
    expect(badges[0].name).toBe("First Fan");
    expect(badges[1].name).toBe("Critic");
  });
});
