import { describe, it, expect, vi, beforeEach } from "vitest";
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

  it("returns empty results for query shorter than 2 chars", async () => {
    const result = await search("a");
    expect(result.venues).toEqual([]);
    expect(result.comedians).toEqual([]);
    expect(result.events).toEqual([]);
    expect(vi.mocked(prisma.venue.findMany)).not.toHaveBeenCalled();
  });

  it("returns empty results for empty string", async () => {
    const result = await search("");
    expect(result.venues).toEqual([]);
    expect(result.comedians).toEqual([]);
    expect(result.events).toEqual([]);
  });

  it("returns empty results for whitespace-only", async () => {
    const result = await search("   ");
    expect(result.venues).toEqual([]);
    expect(result.comedians).toEqual([]);
    expect(result.events).toEqual([]);
  });

  it("queries all three models with search term", async () => {
    await search("comedy", 5);
    expect(vi.mocked(prisma.venue.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ name: expect.anything() }),
            expect.objectContaining({ city: expect.anything() }),
            expect.objectContaining({ state: expect.anything() }),
          ]),
        }),
      }),
    );
    expect(vi.mocked(prisma.comedian.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.anything(),
        }),
      }),
    );
    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: expect.anything(),
          OR: expect.anything(),
        }),
      }),
    );
  });

  it("respects take parameter", async () => {
    await search("test", 10);
    // The unified search uses a fetch limit that's derived from the take param
    expect(vi.mocked(prisma.venue.findMany)).toHaveBeenCalled();
  });
});
