import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateTrendingNearYouFeed } from "@/lib/discovery-engine";

/**
 * GET - Get trending near you feed.
 * Query params: lat, lng, limit
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get("lat") ?? "");
    const lng = parseFloat(searchParams.get("lng") ?? "");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: "Missing required query params: lat, lng" },
        { status: 400 },
      );
    }

    const feed = await generateTrendingNearYouFeed(
      session.user.id,
      { lat, lng },
      limit,
    );

    return NextResponse.json({ items: feed, count: feed.length });
  } catch (err) {
    console.error("Discovery trending-nearby GET error:", err);
    return NextResponse.json(
      { error: "Failed to generate trending feed" },
      { status: 500 },
    );
  }
}
