import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateHappeningTonightFeed } from "@/lib/discovery-engine";

/**
 * GET - Get happening tonight feed.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);

    const feed = await generateHappeningTonightFeed(session.user.id, limit);

    return NextResponse.json({ items: feed, count: feed.length });
  } catch (err) {
    console.error("Discovery tonight GET error:", err);
    return NextResponse.json(
      { error: "Failed to generate tonight feed" },
      { status: 500 },
    );
  }
}
