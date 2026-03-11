import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getArticle, listArticles } from "@/lib/news";

type PageProps = { params: Promise<{ slug: string }> };

const CATEGORY_LABELS: Record<string, string> = {
  industry: "Industry",
  festival: "Festivals",
  venue_opening: "Venue Openings",
  comedian_news: "Comedian News",
  editorial: "Editorial",
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: "Article | Punchline Atlas" };

  const siteUrl =
    process.env.NEXTAUTH_URL ?? "https://punchline-atlas.vercel.app";
  const description = article.excerpt.slice(0, 160);
  const ogImageUrl =
    article.coverImage ??
    `${siteUrl}/api/og?title=${encodeURIComponent(article.title)}&subtitle=${encodeURIComponent(description)}&type=news`;

  return {
    title: `${article.title} | Punchline Atlas`,
    description,
    openGraph: {
      title: `${article.title} | Punchline Atlas`,
      description,
      url: `${siteUrl}/news/${slug}`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: `${article.title} | Punchline Atlas`,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article || !article.published) notFound();

  // Fetch related articles (same category, excluding current)
  let related: Awaited<ReturnType<typeof listArticles>>["articles"] = [];
  try {
    const result = await listArticles({
      category: article.category,
      published: true,
      take: 3,
    });
    related = result.articles.filter((a) => a.id !== article.id).slice(0, 3);
  } catch {
    // ignore
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Back link */}
        <Link
          href="/news"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors mb-6"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to News
        </Link>

        {/* Category badge + date */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Link
            href={`/news?category=${article.category}`}
            className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-brand-gold/20 text-brand-gold hover:bg-brand-gold/30 transition-colors"
          >
            {CATEGORY_LABELS[article.category] ?? article.category}
          </Link>
          {article.publishedAt && (
            <time className="text-sm text-zinc-500">
              {new Date(article.publishedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </time>
          )}
          {article.author?.name && (
            <span className="text-sm text-zinc-500">
              by {article.author.name}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
          {article.title}
        </h1>

        {/* Excerpt */}
        <p className="text-lg text-zinc-400 mb-6">{article.excerpt}</p>

        {/* Cover image */}
        {article.coverImage && (
          <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-800 mb-8">
            <Image
              src={article.coverImage}
              alt={article.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Article body */}
        <div className="prose prose-invert prose-zinc max-w-none text-zinc-300 leading-relaxed whitespace-pre-wrap">
          {article.body}
        </div>

        {/* Source attribution */}
        {article.sourceName && (
          <div className="mt-8 p-4 rounded-lg bg-zinc-800/50 border border-zinc-700 text-sm text-zinc-400">
            Source:{" "}
            {article.sourceUrl ? (
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-gold hover:underline"
              >
                {article.sourceName}
              </a>
            ) : (
              <span>{article.sourceName}</span>
            )}
          </div>
        )}

        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-6">
            {article.tags.map((tag) => (
              <Link
                key={tag}
                href={`/news?tag=${encodeURIComponent(tag)}`}
                className="px-3 py-1 text-xs rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* Related articles */}
        {related.length > 0 && (
          <section className="mt-12 pt-8 border-t border-zinc-800">
            <h2 className="text-lg font-semibold text-white mb-4">
              Related Articles
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {related.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/news/${rel.slug}`}
                  className="group block rounded-xl bg-brand-surface border border-zinc-800/80 hover:border-brand-gold/40 transition overflow-hidden"
                >
                  {rel.coverImage && (
                    <div className="relative aspect-video bg-zinc-800">
                      <Image
                        src={rel.coverImage}
                        alt={rel.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-white group-hover:text-brand-gold transition line-clamp-2">
                      {rel.title}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      {rel.publishedAt
                        ? new Date(rel.publishedAt).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" },
                          )
                        : "Draft"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
