import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  computeSceneIntelligence,
  getSceneIntelligenceBySlug,
} from "./scene-intelligence";

vi.mock("./prisma", () => ({
  prisma: {
    venue: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    sceneInsightSnapshot: { upsert: vi.fn() },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  venue: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  sceneInsightSnapshot: { upsert: ReturnType<typeof vi.fn> };
};

describe("scene-intelligence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when a city slug is unknown", async () => {
    mockPrisma.venue.findFirst.mockResolvedValue(null);
    await expect(getSceneIntelligenceBySlug("unknown-city")).resolves.toBeNull();
  });

  it("computes scene metrics and persists a snapshot", async () => {
    mockPrisma.venue.findMany.mockResolvedValue([
      {
        id: "v1",
        name: "Club A",
        followers: [{ id: "f1" }, { id: "f2" }],
        events: [
          {
            id: "e-upcoming",
            date: new Date(Date.now() + 86400000),
            priceMin: 25,
            reviews: [],
            attendees: [],
            comedians: [
              {
                comedian: {
                  slug: "comic-a",
                  name: "Comic A",
                  genres: [{ genre: "dark" }, { genre: "crowd work" }],
                },
              },
            ],
          },
          {
            id: "e-past",
            date: new Date(Date.now() - 86400000),
            priceMin: 20,
            reviews: [{ rating: 5, verifiedAttendance: true }],
            attendees: [{ id: "a1" }, { id: "a2" }],
            comedians: [
              {
                comedian: {
                  slug: "comic-a",
                  name: "Comic A",
                  genres: [{ genre: "dark" }],
                },
              },
              {
                comedian: {
                  slug: "comic-b",
                  name: "Comic B",
                  genres: [{ genre: "observational" }],
                },
              },
            ],
          },
        ],
      },
    ]);
    mockPrisma.sceneInsightSnapshot.upsert.mockResolvedValue({});

    const result = await computeSceneIntelligence("Nashville", "TN");

    expect(result.city).toBe("Nashville");
    expect(result.topAttributes.length).toBeGreaterThan(0);
    expect(result.sceneScore).toBeGreaterThan(0);
    expect(mockPrisma.sceneInsightSnapshot.upsert).toHaveBeenCalled();
  });
});
