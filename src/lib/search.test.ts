import { describe, it, expect, vi, beforeEach } from "vitest";
import { search } from "./search";

vi.mock("./prisma", () => ({
  prisma: {
    venue: {
      findMany: vi.fn(),
    },
    comedian: {
      findMany: vi.fn(),
    },
    event: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

describe("search", () => {
  beforeEach(() => {
    vi.mocked(prisma.venue.findMany).mockResolvedValue([]);
    vi.mocked(prisma.comedian.findMany).mockResolvedValue([]);
    vi.mocked(prisma.event.findMany).mockResolvedValue([]);
  });

  it("returns empty results for query shorter than 2 chars", async () => {
    const result = await search("a");
    expect(result).toEqual({ venues: [], comedians: [], events: [] });
    expect(vi.mocked(prisma.venue.findMany)).not.toHaveBeenCalled();
  });

  it("returns empty results for empty string", async () => {
    const result = await search("");
    expect(result).toEqual({ venues: [], comedians: [], events: [] });
  });

  it("returns empty results for whitespace-only", async () => {
    const result = await search("   ");
    expect(result).toEqual({ venues: [], comedians: [], events: [] });
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
        take: 5,
      })
    );
    expect(vi.mocked(prisma.comedian.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.anything(),
        }),
        take: 5,
      })
    );
    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: expect.anything(),
          OR: expect.anything(),
        }),
        take: 5,
      })
    );
  });

  it("respects take parameter", async () => {
    await search("test", 10);
    expect(vi.mocked(prisma.venue.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 })
    );
  });
});
