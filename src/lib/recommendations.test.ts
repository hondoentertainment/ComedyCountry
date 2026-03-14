import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    comedianFollow: { findMany: vi.fn() },
    eventReview: { findMany: vi.fn() },
    comedianGenre: { findMany: vi.fn() },
    comedian: { findMany: vi.fn() },
    venueFollow: { findMany: vi.fn() },
    eventAttendance: { findMany: vi.fn() },
    event: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/taste-profile", () => ({
  getTasteProfile: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getTasteProfile } from "@/lib/taste-profile";
import { getRecommendedComedians, getRecommendedEvents } from "./recommendations";

beforeEach(() => vi.clearAllMocks());

describe("getRecommendedComedians", () => {
  it("returns popular comedians for cold-start users", async () => {
    vi.mocked(prisma.comedianFollow.findMany).mockResolvedValue([]);
    vi.mocked(prisma.eventReview.findMany).mockResolvedValue([]);
    vi.mocked(prisma.comedianGenre.findMany).mockResolvedValue([]);
    vi.mocked(getTasteProfile).mockResolvedValue(null);
    vi.mocked(prisma.comedian.findMany).mockResolvedValue([
      { id: "c1", name: "Dave", slug: "dave", headshotUrl: null, genres: [{ genre: "observational" }], _count: { followers: 100 } },
    ] as never);

    const result = await getRecommendedComedians("user-1");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Dave");
    expect(result[0].reason).toContain("Popular");
  });

  it("recommends based on genre affinity", async () => {
    vi.mocked(prisma.comedianFollow.findMany).mockResolvedValue([
      { comedianId: "c1" },
    ] as never);
    vi.mocked(prisma.eventReview.findMany).mockResolvedValue([]);
    vi.mocked(prisma.comedianGenre.findMany).mockResolvedValue([
      { genre: "dark" },
    ] as never);
    vi.mocked(getTasteProfile).mockResolvedValue({
      id: "tp-1",
      userId: "user-1",
      dimensions: { dark: 1 },
      topGenres: ["dark"],
      attributeScores: { dark: 1, club_energy: 0.6 },
      topAttributes: ["dark", "club_energy"],
      negativeSignals: {},
      profileVersion: "v2",
      profileSummary: "Dark and club-energy leaning.",
      discoveryStretch: 0.35,
      confidence: 0.6,
      lastComputed: new Date(),
    });
    vi.mocked(prisma.comedian.findMany).mockResolvedValue([
      { id: "c2", name: "New Comedian", slug: "new", headshotUrl: null, genres: [{ genre: "dark" }], _count: { followers: 50 } },
    ] as never);

    const result = await getRecommendedComedians("user-1");
    expect(result).toHaveLength(1);
    expect(result[0].reason).toContain("dark");
  });
});

describe("getRecommendedEvents", () => {
  it("recommends events with followed comedians", async () => {
    vi.mocked(prisma.comedianFollow.findMany).mockResolvedValue([
      { comedianId: "c1" },
    ] as never);
    vi.mocked(prisma.venueFollow.findMany).mockResolvedValue([]);
    vi.mocked(prisma.eventAttendance.findMany).mockResolvedValue([]);
    vi.mocked(getTasteProfile).mockResolvedValue({
      id: "tp-1",
      userId: "user-1",
      dimensions: { dark: 1 },
      topGenres: ["dark"],
      attributeScores: { dark: 1 },
      topAttributes: ["dark"],
      negativeSignals: {},
      profileVersion: "v2",
      profileSummary: "Dark leaning.",
      discoveryStretch: 0.35,
      confidence: 0.6,
      lastComputed: new Date(),
    });
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      {
        id: "e1",
        title: "Big Show",
        date: new Date(),
        venueId: "v1",
        venue: { name: "Club", city: "NYC", state: "NY" },
        comedians: [{ comedianId: "c1", comedian: { name: "Dave", slug: "dave", genres: [{ genre: "dark" }] } }],
        _count: { attendees: 10 },
      },
    ] as never);

    const result = await getRecommendedEvents("user-1");
    expect(result).toHaveLength(1);
    expect(result[0].reason).toContain("Dave");
  });
});
