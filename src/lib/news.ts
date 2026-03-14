import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

const NEWS_CATEGORIES = [
  "industry",
  "festival",
  "venue_opening",
  "comedian_news",
  "editorial",
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export function getAvailableCategories() {
  return NEWS_CATEGORIES;
}

// ---------------------------------------------------------------------------
// List articles (paginated, filterable)
// ---------------------------------------------------------------------------

type ListArticlesParams = {
  category?: string;
  tag?: string;
  featured?: boolean;
  published?: boolean;
  page?: number;
  take?: number;
};

export async function listArticles(params: ListArticlesParams = {}) {
  const {
    category,
    tag,
    featured,
    published,
    page = 1,
    take = 12,
  } = params;

  const where: Prisma.NewsArticleWhereInput = {};

  if (typeof published === "boolean") where.published = published;
  if (typeof featured === "boolean") where.featured = featured;
  if (category) where.category = category;
  if (tag) where.tags = { has: tag };

  const skip = (page - 1) * take;

  const [articles, total] = await Promise.all([
    prisma.newsArticle.findMany({
      where,
      take,
      skip,
      orderBy: { publishedAt: "desc" },
      include: { author: { select: { id: true, name: true, image: true } } },
    }),
    prisma.newsArticle.count({ where }),
  ]);

  return {
    articles,
    total,
    page,
    pages: Math.ceil(total / take),
  };
}

// ---------------------------------------------------------------------------
// Get single article by slug
// ---------------------------------------------------------------------------

export async function getArticle(slug: string) {
  return prisma.newsArticle.findUnique({
    where: { slug },
    include: { author: { select: { id: true, name: true, image: true } } },
  });
}

// ---------------------------------------------------------------------------
// Create article (admin)
// ---------------------------------------------------------------------------

type CreateArticleData = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImage?: string | null;
  category: string;
  tags?: string[];
  authorId?: string | null;
  published?: boolean;
  publishedAt?: Date | string | null;
  featured?: boolean;
  sourceUrl?: string | null;
  sourceName?: string | null;
};

export async function createArticle(data: CreateArticleData) {
  return prisma.newsArticle.create({
    data: {
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      body: data.body,
      coverImage: data.coverImage ?? null,
      category: data.category,
      tags: data.tags ?? [],
      authorId: data.authorId ?? null,
      published: data.published ?? false,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
      featured: data.featured ?? false,
      sourceUrl: data.sourceUrl ?? null,
      sourceName: data.sourceName ?? null,
    },
    include: { author: { select: { id: true, name: true, image: true } } },
  });
}

// ---------------------------------------------------------------------------
// Update article (admin)
// ---------------------------------------------------------------------------

type UpdateArticleData = Partial<CreateArticleData>;

export async function updateArticle(id: string, data: UpdateArticleData) {
  const update: Prisma.NewsArticleUpdateInput = {};

  if (data.title !== undefined) update.title = data.title;
  if (data.slug !== undefined) update.slug = data.slug;
  if (data.excerpt !== undefined) update.excerpt = data.excerpt;
  if (data.body !== undefined) update.body = data.body;
  if (data.coverImage !== undefined) update.coverImage = data.coverImage;
  if (data.category !== undefined) update.category = data.category;
  if (data.tags !== undefined) update.tags = data.tags;
  if (data.published !== undefined) update.published = data.published;
  if (data.publishedAt !== undefined) {
    update.publishedAt = data.publishedAt ? new Date(data.publishedAt) : null;
  }
  if (data.featured !== undefined) update.featured = data.featured;
  if (data.sourceUrl !== undefined) update.sourceUrl = data.sourceUrl;
  if (data.sourceName !== undefined) update.sourceName = data.sourceName;
  if (data.authorId !== undefined) {
    update.author = data.authorId
      ? { connect: { id: data.authorId } }
      : { disconnect: true };
  }

  return prisma.newsArticle.update({
    where: { id },
    data: update,
    include: { author: { select: { id: true, name: true, image: true } } },
  });
}

// ---------------------------------------------------------------------------
// Delete article (admin)
// ---------------------------------------------------------------------------

export async function deleteArticle(id: string) {
  return prisma.newsArticle.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Get categories with counts (published only)
// ---------------------------------------------------------------------------

export async function getCategories() {
  const results = await prisma.newsArticle.groupBy({
    by: ["category"],
    where: { published: true },
    _count: { id: true },
    orderBy: { category: "asc" },
  });

  return results.map((r) => ({ category: r.category, count: r._count.id }));
}
