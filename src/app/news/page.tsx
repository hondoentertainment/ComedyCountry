import Link from "next/link";
import Image from "next/image";
import { listArticles, getCategories } from "@/lib/news";
import { Pagination } from "@/components/Pagination";
import { PAGE_SIZE } from "@/lib/constants";

export const metadata = {
  title: "Comedy News | Punchline Atlas",
  description:
    "The latest comedy industry news, festival announcements, venue openings, and comedian updates.",
};

export const revalidate = 60;

const CATEGORY_LABELS: Record<string, string> = {
  industry: "Industry",
  festival: "Festivals",
  venue_opening: "Venue Openings",
  comedian_news: "Comedian News",
  editorial: "Editorial",
};

type PageProps = {
  searchParams: Promise<{ category?: string; page?: string }>;
};

export default async function NewsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { category, page } = params;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);

  let articles: Awaited<ReturnType<typeof listArticles>>["articles"] = [];
  let total = 0;
  let featured: typeof articles = [];
  let categories: Awaited<ReturnType<typeof getCategories>> = [];

  try {
    const [result, featuredResult, cats] = await Promise.all([
      listArticles({
        category,
        published: true,
        page: currentPage,
        take: PAGE_SIZE,
      }),
      // Only fetch featured on the first page with no category filter
      !category && currentPage === 1
        ? listArticles({ featured: true, published: true, take: 3 })
        : Promise.resolve({ articles: [], total: 0, page: 1, pages: 0 }),
      getCategories(),
    ]);

    articles = result.articles;
    total = result.total;
    featured = featuredResult.articles;
    categories = cats;
  } catch {
    // DB not configured
  }

  const featuredIds = new Set(featured.map((a) => a.id));
  const gridArticles =
    currentPage === 1 && !category
      ? articles.filter((a) => !featuredIds.has(a.id))
      : articles;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Comedy News</h1>
          <p className="text-zinc-400 text-sm">
            The latest from the comedy world — industry updates, festival
            announcements, and more.
          </p>
        </div>

        {/* Category filter tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            href="/news"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !category
                ? "bg-brand-gold text-brand-dark"
                : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
            }`}
          >
            All
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.category}
              href={`/news?category=${cat.category}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                category === cat.category
                  ? "bg-brand-gold text-brand-dark"
                  : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
              }`}
            >
              {CATEGORY_LABELS[cat.category] ?? cat.category} ({cat.count})
            </Link>
          ))}
        </div>

        {/* Featured hero section (first page, no category) */}
        {featured.length > 0 && currentPage === 1 && !category && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-white mb-4">Featured</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((article) => (
                <Link
                  key={article.id}
                  href={`/news/${article.slug}`}
                  className="group block rounded-xl bg-brand-surface border border-zinc-800/80 hover:border-brand-gold/40 transition overflow-hidden"
                >
                  {article.coverImage && (
                    <div className="relative aspect-video bg-zinc-800">
                      <Image
                        src={article.coverImage}
                        alt={article.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-brand-gold/20 text-brand-gold mb-2">
                      {CATEGORY_LABELS[article.category] ?? article.category}
                    </span>
                    <h3 className="text-lg font-semibold text-white group-hover:text-brand-gold transition line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                      {article.excerpt}
                    </p>
                    <p className="text-xs text-zinc-500 mt-2">
                      {article.publishedAt
                        ? new Date(article.publishedAt).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric", year: "numeric" },
                          )
                        : "Draft"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Article grid */}
        {articles.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <p className="text-lg">No articles found.</p>
            <p className="text-sm mt-1">
              {category
                ? "Try a different category or check back later."
                : "Check back soon for the latest comedy news."}
            </p>
          </div>
        ) : (
          <>
            {gridArticles.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {gridArticles.map((article) => (
                  <Link
                    key={article.id}
                    href={`/news/${article.slug}`}
                    className="group block rounded-xl bg-brand-surface border border-zinc-800/80 hover:border-brand-gold/40 transition overflow-hidden"
                  >
                    {article.coverImage && (
                      <div className="relative aspect-video bg-zinc-800">
                        <Image
                          src={article.coverImage}
                          alt={article.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-zinc-700 text-zinc-300 mb-2">
                        {CATEGORY_LABELS[article.category] ?? article.category}
                      </span>
                      <h3 className="text-base font-semibold text-white group-hover:text-brand-gold transition line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                        {article.excerpt}
                      </p>
                      <div className="flex items-center justify-between mt-3 text-xs text-zinc-500">
                        <span>
                          {article.publishedAt
                            ? new Date(
                                article.publishedAt,
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "Draft"}
                        </span>
                        {article.author?.name && (
                          <span>by {article.author.name}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <Pagination
              total={total}
              currentPage={currentPage}
              basePath="/news"
              searchParams={{ category }}
            />
          </>
        )}
      </div>
    </div>
  );
}
