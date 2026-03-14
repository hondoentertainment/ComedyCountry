import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
  getCategories,
} from "./news";

vi.mock("./prisma", () => ({
  prisma: {
    newsArticle: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";

const mockPrisma = prisma as unknown as {
  newsArticle: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
  };
};

const sampleArticle = {
  id: "art1",
  title: "Comedy Festival Announced",
  slug: "comedy-festival-announced",
  excerpt: "A new comedy festival is coming this summer.",
  body: "Full body text here...",
  coverImage: null,
  category: "festival",
  tags: ["festival", "summer"],
  authorId: "user1",
  author: { id: "user1", name: "Test Author", image: null },
  published: true,
  publishedAt: new Date("2026-03-01"),
  featured: false,
  sourceUrl: null,
  sourceName: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("news", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ── listArticles ─────────────────────────────────────────────── */

  describe("listArticles", () => {
    it("returns paginated results", async () => {
      const articles = [sampleArticle];
      mockPrisma.newsArticle.findMany.mockResolvedValue(articles);
      mockPrisma.newsArticle.count.mockResolvedValue(1);

      const result = await listArticles();

      expect(result).toEqual({
        articles,
        total: 1,
        page: 1,
        pages: 1,
      });
      expect(mockPrisma.newsArticle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 12,
          skip: 0,
          orderBy: { publishedAt: "desc" },
        }),
      );
    });

    it("respects page and take parameters", async () => {
      mockPrisma.newsArticle.findMany.mockResolvedValue([]);
      mockPrisma.newsArticle.count.mockResolvedValue(25);

      const result = await listArticles({ page: 2, take: 10 });

      expect(result.page).toBe(2);
      expect(result.pages).toBe(3);
      expect(mockPrisma.newsArticle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 10 }),
      );
    });

    it("filters by category", async () => {
      mockPrisma.newsArticle.findMany.mockResolvedValue([]);
      mockPrisma.newsArticle.count.mockResolvedValue(0);

      await listArticles({ category: "festival" });

      expect(mockPrisma.newsArticle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: "festival" }),
        }),
      );
    });

    it("filters by published only", async () => {
      mockPrisma.newsArticle.findMany.mockResolvedValue([]);
      mockPrisma.newsArticle.count.mockResolvedValue(0);

      await listArticles({ published: true });

      expect(mockPrisma.newsArticle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ published: true }),
        }),
      );
    });

    it("filters by tag", async () => {
      mockPrisma.newsArticle.findMany.mockResolvedValue([]);
      mockPrisma.newsArticle.count.mockResolvedValue(0);

      await listArticles({ tag: "summer" });

      expect(mockPrisma.newsArticle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tags: { has: "summer" } }),
        }),
      );
    });

    it("filters by featured", async () => {
      mockPrisma.newsArticle.findMany.mockResolvedValue([]);
      mockPrisma.newsArticle.count.mockResolvedValue(0);

      await listArticles({ featured: true });

      expect(mockPrisma.newsArticle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ featured: true }),
        }),
      );
    });
  });

  /* ── getArticle ───────────────────────────────────────────────── */

  describe("getArticle", () => {
    it("returns article by slug", async () => {
      mockPrisma.newsArticle.findUnique.mockResolvedValue(sampleArticle);

      const result = await getArticle("comedy-festival-announced");

      expect(result).toEqual(sampleArticle);
      expect(mockPrisma.newsArticle.findUnique).toHaveBeenCalledWith({
        where: { slug: "comedy-festival-announced" },
        include: {
          author: { select: { id: true, name: true, image: true } },
        },
      });
    });

    it("returns null for nonexistent slug", async () => {
      mockPrisma.newsArticle.findUnique.mockResolvedValue(null);

      const result = await getArticle("does-not-exist");

      expect(result).toBeNull();
    });
  });

  /* ── createArticle ────────────────────────────────────────────── */

  describe("createArticle", () => {
    it("creates an article with provided data", async () => {
      mockPrisma.newsArticle.create.mockResolvedValue(sampleArticle);

      const result = await createArticle({
        title: "Comedy Festival Announced",
        slug: "comedy-festival-announced",
        excerpt: "A new comedy festival is coming this summer.",
        body: "Full body text here...",
        category: "festival",
        tags: ["festival", "summer"],
      });

      expect(result).toEqual(sampleArticle);
      expect(mockPrisma.newsArticle.create).toHaveBeenCalledTimes(1);
    });
  });

  /* ── updateArticle ────────────────────────────────────────────── */

  describe("updateArticle", () => {
    it("updates an article", async () => {
      const updated = { ...sampleArticle, title: "Updated Title" };
      mockPrisma.newsArticle.update.mockResolvedValue(updated);

      const result = await updateArticle("art1", { title: "Updated Title" });

      expect(result.title).toBe("Updated Title");
      expect(mockPrisma.newsArticle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "art1" },
          data: expect.objectContaining({ title: "Updated Title" }),
        }),
      );
    });
  });

  /* ── deleteArticle ────────────────────────────────────────────── */

  describe("deleteArticle", () => {
    it("deletes an article by id", async () => {
      mockPrisma.newsArticle.delete.mockResolvedValue(sampleArticle);

      await deleteArticle("art1");

      expect(mockPrisma.newsArticle.delete).toHaveBeenCalledWith({
        where: { id: "art1" },
      });
    });
  });

  /* ── getCategories ────────────────────────────────────────────── */

  describe("getCategories", () => {
    it("returns categories with counts", async () => {
      mockPrisma.newsArticle.groupBy.mockResolvedValue([
        { category: "festival", _count: { id: 5 } },
        { category: "industry", _count: { id: 3 } },
      ]);

      const result = await getCategories();

      expect(result).toEqual([
        { category: "festival", count: 5 },
        { category: "industry", count: 3 },
      ]);
    });
  });
});
