import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { listArticles, createArticle } from "@/lib/news";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`news:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") ?? undefined;
    const tag = searchParams.get("tag") ?? undefined;
    const featured = searchParams.has("featured")
      ? searchParams.get("featured") === "true"
      : undefined;
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const take = parseInt(searchParams.get("take") ?? "12", 10);

    const result = await listArticles({
      category,
      tag,
      featured,
      published: true, // public endpoint only returns published
      page,
      take: Math.min(take, 50),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/news error:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(`news:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const admin = await requireAdmin();
    if (!admin.authorized) {
      return NextResponse.json(
        { error: admin.reason },
        { status: admin.reason === "Not authenticated" ? 401 : 403 },
      );
    }

    const body = await request.json();
    const { title, slug, excerpt, body: articleBody, category } = body;

    if (!title || !slug || !excerpt || !articleBody || !category) {
      return NextResponse.json(
        { error: "title, slug, excerpt, body, and category are required" },
        { status: 400 },
      );
    }

    const article = await createArticle({
      ...body,
      body: articleBody,
      authorId: body.authorId ?? admin.session.user.id,
    });

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    console.error("POST /api/news error:", error);
    return NextResponse.json(
      { error: "Failed to create article" },
      { status: 500 },
    );
  }
}
