import { describe, expect, it } from "vitest";
import { scoreRoomFit } from "@/lib/room-fit";

describe("room-fit", () => {
  it("elevates trusted club shows in strong scenes", () => {
    const result = scoreRoomFit({
      showType: "HEADLINE",
      venue: { name: "Comedy Cellar", city: "New York", state: "NY", type: "CLUB", capacity: 140 },
      comedians: [{ comedian: { name: "Comic", genres: [{ genre: "observational" }] } }],
      trust: {
        trustScore: 88,
        badges: [],
        freshness: {
          score: 84,
          status: "fresh",
          sourceConfidence: 86,
          lastVerifiedAt: new Date(),
          updatedWithinDays: 1,
          reasons: [],
        },
        accessibilityScore: 40,
        lastVerifiedAt: new Date(),
        transparentPricing: true,
        antiScalping: true,
        controlledResale: false,
        fairWaitlist: true,
      },
      scene: {
        sceneScore: 90,
        momentumScore: 86,
        loyaltyScore: 84,
        varietyScore: 82,
      },
      priceMin: 25,
      priceMax: 35,
    });

    expect(result.label).toBe("Best room tonight");
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it("falls back when trust and lineup signals are weak", () => {
    const result = scoreRoomFit({
      showType: "OPEN_MIC",
      venue: { name: "Bar Room", city: "Austin", state: "TX", type: "BAR", capacity: 50 },
      comedians: [],
      trust: {
        trustScore: 34,
        badges: [],
        freshness: {
          score: 28,
          status: "stale",
          sourceConfidence: 32,
          lastVerifiedAt: null,
          updatedWithinDays: 45,
          reasons: [],
        },
        accessibilityScore: 0,
        lastVerifiedAt: null,
        transparentPricing: false,
        antiScalping: false,
        controlledResale: false,
        fairWaitlist: false,
      },
      scene: {
        sceneScore: 48,
        momentumScore: 46,
        loyaltyScore: 40,
        varietyScore: 50,
      },
      priceMin: null,
      priceMax: null,
    });

    expect(result.label).toBe("Needs more signal");
    expect(result.score).toBeLessThan(54);
  });
});
