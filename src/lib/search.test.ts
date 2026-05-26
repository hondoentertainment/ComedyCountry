import { beforeEach, describe, expect, it, vi } from "vitest";
import { search } from "./search";

vi.mock("./prisma", () => ({
  prisma: {
    venue: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    comedian: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    comedianGenre: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    event: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

describe("search", () => {
  beforeEach(() => {
    vi.mocked(prisma.venue.findMany).mockResolvedValue([]);
    vi.mocked(prisma.venue.count).mockResolvedValue(0);
    vi.mocked(prisma.venue.groupBy).mockResolvedValue([]);
    vi.mocked(prisma.comedian.findMany).mockResolvedValue([]);
    vi.mocked(prisma.comedian.count).mockResolvedValue(0);
    vi.mocked(prisma.comedianGenre.findMany).mockResolvedValue([]);
    vi.mocked(prisma.comedianGenre.groupBy).mockResolvedValue([]);
    vi.mocked(prisma.event.findMany).mockResolvedValue([]);
    vi.mocked(prisma.event.count).mockResolvedValue(0);
    vi.mocked(prisma.event.groupBy).mockResolvedValue([]);
  });

  it("returns empty results for short queries", async () => {
    const result = await search("a");

    expect(result.venues).toEqual([]);
    expect(result.comedians).toEqual([]);
    expect(result.events).toEqual([]);
    expect(prisma.venue.findMany).not.toHaveBeenCalled();
  });

  it("returns empty results for whitespace-only queries", async () => {
    const result = await search("   ");

    expect(result.venues).toEqual([]);
    expect(result.comedians).toEqual([]);
    expect(result.events).toEqual([]);
  });

  it("queries venues, comedians, and events for valid terms", async () => {
    await search("comedy", 5);

    expect(prisma.venue.findMany).toHaveBeenCalled();
    expect(prisma.comedian.findMany).toHaveBeenCalled();
    expect(prisma.event.findMany).toHaveBeenCalled();
    expect(prisma.venue.count).toHaveBeenCalled();
    expect(prisma.comedian.count).toHaveBeenCalled();
    expect(prisma.event.count).toHaveBeenCalled();
  });
});
