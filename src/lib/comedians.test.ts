import { describe, it, expect, vi, beforeEach } from "vitest";
import { listComedians, getComedian } from "./comedians";

vi.mock("./prisma", () => ({
  prisma: {
    comedian: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  comedian: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

describe("comedians", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listComedians", () => {
    it("returns comedians and total with default params", async () => {
      const mockComedians = [{ id: "c1", name: "Dave Chappelle" }];
      mockPrisma.comedian.findMany.mockResolvedValue(mockComedians);
      mockPrisma.comedian.count.mockResolvedValue(1);

      const result = await listComedians();

      expect(result).toEqual({ comedians: mockComedians, total: 1 });
      expect(mockPrisma.comedian.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          take: 50,
          skip: 0,
        })
      );
    });

    it("filters by touringStatus when provided", async () => {
      mockPrisma.comedian.findMany.mockResolvedValue([]);
      mockPrisma.comedian.count.mockResolvedValue(0);

      await listComedians({ touringStatus: "TOURING" });

      expect(mockPrisma.comedian.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { touringStatus: "TOURING" },
        })
      );
    });

    it("filters by search when provided", async () => {
      mockPrisma.comedian.findMany.mockResolvedValue([]);
      mockPrisma.comedian.count.mockResolvedValue(0);

      await listComedians({ search: "chappelle" });

      expect(mockPrisma.comedian.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: "chappelle", mode: "insensitive" } },
              { slug: { contains: "chappelle", mode: "insensitive" } },
            ],
          }),
        })
      );
    });

    it("filters by genre with exact match when provided", async () => {
      mockPrisma.comedian.findMany.mockResolvedValue([]);
      mockPrisma.comedian.count.mockResolvedValue(0);

      await listComedians({ genre: "observational" });

      expect(mockPrisma.comedian.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            genres: { some: { genre: { equals: "observational", mode: "insensitive" } } },
          }),
        })
      );
    });

    it("respects take and skip", async () => {
      mockPrisma.comedian.findMany.mockResolvedValue([]);
      mockPrisma.comedian.count.mockResolvedValue(50);

      await listComedians({ take: 10, skip: 20 });

      expect(mockPrisma.comedian.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });
  });

  describe("getComedian", () => {
    it("returns comedian by slug with includes", async () => {
      const mockComedian = {
        id: "c1",
        slug: "dave-chappelle",
        name: "Dave Chappelle",
        genres: [],
        events: [],
      };
      mockPrisma.comedian.findUnique.mockResolvedValue(mockComedian);

      const result = await getComedian("dave-chappelle");

      expect(result).toEqual(mockComedian);
      expect(mockPrisma.comedian.findUnique).toHaveBeenCalledWith({
        where: { slug: "dave-chappelle" },
        include: expect.objectContaining({
          genres: true,
          socialLinks: true,
          events: expect.any(Object),
        }),
      });
    });

    it("returns null when comedian not found", async () => {
      mockPrisma.comedian.findUnique.mockResolvedValue(null);

      const result = await getComedian("nonexistent");

      expect(result).toBeNull();
    });
  });
});
