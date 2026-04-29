import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/lib/admin";
import { getArticle, updateArticle, deleteArticle } from "@/lib/news";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  const rl = await checkRateLimit(`news:${getRateLimitKey(request)}`, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const { slug } = await context.params;
    const article = await getArticle(slug);

    if (!article || !article.published) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch (error) {
    logger.error(
      "GET /api/news/[slug] error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to fetch article" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const rl = await checkRateLimit(`news:${getRateLimitKey(request)}`, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const admin = await requireAdmin();
    if (!admin.authorized) {
      return NextResponse.json({ error: admin.reason }, { status: admin.status });
    }

    const { slug } = await context.params;
    const existing = await getArticle(slug);
    if (!existing) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const body = await request.json();
    const article = await updateArticle(existing.id, body);

    return NextResponse.json(article);
  } catch (error) {
    logger.error(
      "PUT /api/news/[slug] error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to update article" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const rl = await checkRateLimit(`news:${getRateLimitKey(request)}`, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const admin = await requireAdmin();
    if (!admin.authorized) {
      return NextResponse.json({ error: admin.reason }, { status: admin.status });
    }

    const { slug } = await context.params;
    const existing = await getArticle(slug);
    if (!existing) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    await deleteArticle(existing.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "DELETE /api/news/[slug] error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to delete article" },
      { status: 500 },
    );
  }
}
