import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getArticle, updateArticle, deleteArticle } from "@/lib/news";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const article = await getArticle(slug);

    if (!article || !article.published) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error("GET /api/news/[slug] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch article" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    if (!admin.authorized) {
      return NextResponse.json(
        { error: admin.reason },
        { status: admin.reason === "Not authenticated" ? 401 : 403 },
      );
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
    console.error("PUT /api/news/[slug] error:", error);
    return NextResponse.json(
      { error: "Failed to update article" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    if (!admin.authorized) {
      return NextResponse.json(
        { error: admin.reason },
        { status: admin.reason === "Not authenticated" ? 401 : 403 },
      );
    }

    const { slug } = await context.params;
    const existing = await getArticle(slug);
    if (!existing) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    await deleteArticle(existing.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/news/[slug] error:", error);
    return NextResponse.json(
      { error: "Failed to delete article" },
      { status: 500 },
    );
  }
}
