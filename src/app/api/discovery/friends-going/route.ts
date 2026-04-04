import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateFriendsAttendingFeed } from "@/lib/discovery-engine";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * GET - Get friends attending feed.
 */
export async function GET(request: Request) {
  const rl = await checkRateLimit(
    `discovery-friends-going:${getRateLimitKey(request)}`,
    { limit: 30, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);

    const feed = await generateFriendsAttendingFeed(session.user.id, limit);

    return NextResponse.json({ items: feed, count: feed.length });
  } catch (err) {
    logger.error(
      "Discovery friends-going GET error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to generate friends feed" },
      { status: 500 },
    );
  }
}
