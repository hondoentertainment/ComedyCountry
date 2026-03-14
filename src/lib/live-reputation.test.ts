import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clampRating,
  getEventReputationSummary,
  hasVerifiedAttendance,
  normalizeExperienceInput,
} from "./live-reputation";

vi.mock("./prisma", () => ({
  prisma: {
    ticket: { findFirst: vi.fn() },
    eventAttendance: { findUnique: vi.fn() },
    eventReview: {
      aggregate: vi.fn(),
      count: vi.fn(),
    },
    eventExperienceFeedback: { findMany: vi.fn() },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  ticket: { findFirst: ReturnType<typeof vi.fn> };
  eventAttendance: { findUnique: ReturnType<typeof vi.fn> };
  eventReview: {
    aggregate: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  eventExperienceFeedback: { findMany: ReturnType<typeof vi.fn> };
};

describe("live-reputation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clamps experience ratings to a 1-5 range", () => {
    expect(clampRating(8)).toBe(5);
    expect(clampRating(0)).toBe(1);
    expect(clampRating(undefined)).toBeUndefined();
  });

  it("normalizes structured experience input", () => {
    const normalized = normalizeExperienceInput({
      setQuality: 5,
      pacing: 7,
      notes: "  Great closer  ",
    });

    expect(normalized).toEqual({
      setQuality: 5,
      crowdFit: undefined,
      roomVibe: undefined,
      pacing: 5,
      valueForPrice: undefined,
      openerStrength: undefined,
      surpriseGuests: undefined,
      wouldRecommend: undefined,
      notes: "Great closer",
    });
  });

  it("treats tickets or RSVPs as verified attendance", async () => {
    mockPrisma.ticket.findFirst.mockResolvedValueOnce({ id: "t1", scannedAt: null });
    mockPrisma.eventAttendance.findUnique.mockResolvedValueOnce(null);
    await expect(hasVerifiedAttendance("e1", "u1")).resolves.toBe(true);

    mockPrisma.ticket.findFirst.mockResolvedValueOnce(null);
    mockPrisma.eventAttendance.findUnique.mockResolvedValueOnce({ id: "a1" });
    await expect(hasVerifiedAttendance("e1", "u1")).resolves.toBe(true);
  });

  it("builds a trust summary from reviews and feedback", async () => {
    mockPrisma.eventReview.aggregate.mockResolvedValue({
      _count: 4,
      _avg: { rating: 4.25 },
    });
    mockPrisma.eventReview.count.mockResolvedValue(3);
    mockPrisma.eventExperienceFeedback.findMany.mockResolvedValue([
      {
        verifiedAttendance: true,
        setQuality: 5,
        crowdFit: 4,
        roomVibe: 5,
        pacing: 4,
        valueForPrice: 4,
        openerStrength: 5,
        wouldRecommend: true,
        surpriseGuests: true,
      },
      {
        verifiedAttendance: false,
        setQuality: 4,
        crowdFit: 4,
        roomVibe: 4,
        pacing: 4,
        valueForPrice: 3,
        openerStrength: 4,
        wouldRecommend: true,
        surpriseGuests: false,
      },
    ]);

    const summary = await getEventReputationSummary("event-1");

    expect(summary.averageRating).toBe(4.3);
    expect(summary.verifiedReviewCount).toBe(3);
    expect(summary.trustScore).toBeGreaterThan(0);
    expect(summary.topSignals.length).toBeGreaterThan(0);
  });
});
