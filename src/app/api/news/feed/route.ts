import { NextResponse } from "next/server";
import { listArticles, getCategories } from "@/lib/news";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// GET /api/news/feed — public curated editorial feed
//
// Returns a structured feed with featured articles, latest by category,
// and editorial picks. Designed for consumption by frontend feeds,
// mobile apps, and RSS-style consumers.
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const rl = await checkRateLimit(`news-feed:${getRateLimitKey(request)}`, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") ?? undefined;
    const tag = searchParams.get("tag") ?? undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const take = Math.min(
      Math.max(1, parseInt(searchParams.get("take") ?? "20", 10)),
      50,
    );
    const featured = searchParams.get("featured") === "true";
    const editorialOnly = searchParams.get("editorial") === "true";

    // Build the feed response
    const feedCategory = editorialOnly ? "editorial" : category;

    const [mainResult, featuredResult, categories] = await Promise.all([
      listArticles({
        category: feedCategory,
        tag,
        published: true,
        page,
        take,
      }),
      // Only include featured section on first page when not filtering
      !category && !tag && page === 1
        ? listArticles({ featured: true, published: true, take: 5 })
        : Promise.resolve({ articles: [], total: 0, page: 1, pages: 0 }),
      getCategories(),
    ]);

    // Deduplicate: remove featured articles from the main list
    const featuredIds = new Set(featuredResult.articles.map((a) => a.id));
    const articles = mainResult.articles.filter((a) => !featuredIds.has(a.id));

    // Build curated sections
    const sections: Array<{
      id: string;
      title: string;
      type: "featured" | "category" | "latest";
      articles: typeof articles;
    }> = [];

    // Featured section (only on first page)
    if (featuredResult.articles.length > 0 && page === 1 && !category) {
      sections.push({
        id: "featured",
        title: "Featured Stories",
        type: "featured",
        articles: featuredResult.articles,
      });
    }

    // Main articles section
    sections.push({
      id: feedCategory ?? "latest",
      title: feedCategory
        ? `${feedCategory.charAt(0).toUpperCase()}${feedCategory.slice(1).replace(/_/g, " ")}`
        : "Latest",
      type: feedCategory ? "category" : "latest",
      articles,
    });

    // Response with feed metadata
    const feed = {
      sections,
      pagination: {
        page,
        pages: mainResult.pages,
        total: mainResult.total,
        hasMore: page < mainResult.pages,
      },
      categories: categories.map((c) => ({
        slug: c.category,
        label: formatCategoryLabel(c.category),
        count: c.count,
      })),
      meta: {
        generatedAt: new Date().toISOString(),
        feedUrl: "/api/news/feed",
      },
    };

    return NextResponse.json(feed, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    logger.error(
      "GET /api/news/feed error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to generate news feed" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  industry: "Industry",
  festival: "Festivals",
  venue_opening: "Venue Openings",
  comedian_news: "Comedian News",
  editorial: "Editorial",
};

function formatCategoryLabel(category: string): string {
  return (
    CATEGORY_LABELS[category] ??
    category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, " ")
  );
}
