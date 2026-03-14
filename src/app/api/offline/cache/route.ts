import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  cacheContent,
  getUserCachedItems,
  purgeExpiredCache,
  getCacheStats,
} from "@/lib/offline-cache";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const statsOnly = searchParams.get("stats") === "true";

    if (statsOnly) {
      const stats = await getCacheStats(session.user.id);
      return NextResponse.json(stats);
    }

    const items = await getUserCachedItems(session.user.id);

    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/offline/cache error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cached content" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { contentType, contentId, data, ttlHours } = body;

    if (!contentType || !contentId) {
      return NextResponse.json(
        { error: "contentType and contentId are required" },
        { status: 400 },
      );
    }

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { error: "data must be a JSON object" },
        { status: 400 },
      );
    }

    const cached = await cacheContent(
      session.user.id,
      contentType,
      contentId,
      data,
      ttlHours,
    );

    return NextResponse.json(cached, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.startsWith("Invalid content type") ||
        error.message === "TTL must be a positive number"
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error("POST /api/offline/cache error:", error);
    return NextResponse.json(
      { error: "Failed to cache content" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const result = await purgeExpiredCache();

    return NextResponse.json(result);
  } catch (error) {
    console.error("DELETE /api/offline/cache error:", error);
    return NextResponse.json(
      { error: "Failed to purge cache" },
      { status: 500 },
    );
  }
}
