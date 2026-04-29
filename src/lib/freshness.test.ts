import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

import { getEventFreshnessSnapshot, getVenueFreshnessSnapshot } from "@/lib/freshness";

describe("freshness", () => {
  it("scores a complete recently updated event as fresh", () => {
    const freshness = getEventFreshnessSnapshot({
      updatedAt: new Date(),
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      showtime: "8:00 PM",
      ticketUrl: "https://tickets.test/show",
      priceMin: 20,
      comedians: [{ id: "c1" }],
      accessibilityTags: [{ verifiedBy: "admin", verifiedAt: new Date() }],
      fairPricePolicy: { updatedAt: new Date() },
      venue: { updatedAt: new Date(), website: "https://venue.test" },
    });

    expect(freshness.status).toBe("fresh");
    expect(freshness.score).toBeGreaterThanOrEqual(75);
    expect(freshness.sourceConfidence).toBeGreaterThan(70);
  });

  it("marks incomplete older venues as stale", () => {
    const staleDate = new Date(Date.now() - 70 * 24 * 60 * 60 * 1000);
    const freshness = getVenueFreshnessSnapshot({
      updatedAt: staleDate,
      website: null,
      address: null,
      latitude: null,
      longitude: null,
      capacity: null,
      accessibilityTags: [],
      socialLinks: [],
    });

    expect(freshness.status).toBe("stale");
    expect(freshness.score).toBeLessThan(50);
  });
});
