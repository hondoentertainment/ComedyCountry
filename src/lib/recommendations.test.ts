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

import { prisma } from "@/lib/prisma";
import { getRecommendedComedians, getRecommendedEvents } from "./recommendations";

beforeEach(() => vi.clearAllMocks());

describe("getRecommendedComedians", () => {
  it("returns popular comedians for cold-start users", async () => {
    vi.mocked(prisma.comedianFollow.findMany).mockResolvedValue([]);
    vi.mocked(prisma.eventReview.findMany).mockResolvedValue([]);
    vi.mocked(prisma.comedianGenre.findMany).mockResolvedValue([]);
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
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      {
        id: "e1",
        title: "Big Show",
        date: new Date(),
        venueId: "v1",
        venue: { name: "Club", city: "NYC", state: "NY" },
        comedians: [{ comedianId: "c1", comedian: { name: "Dave", slug: "dave" } }],
        _count: { attendees: 10 },
      },
    ] as never);

    const result = await getRecommendedEvents("user-1");
    expect(result).toHaveLength(1);
    expect(result[0].reason).toContain("Dave");
  });
});
