import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateFriendsAttendingFeed } from "@/lib/discovery-engine";

/**
 * GET - Get friends attending feed.
 */
export async function GET(request: Request) {
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
    console.error("Discovery friends-going GET error:", err);
    return NextResponse.json(
      { error: "Failed to generate friends feed" },
      { status: 500 },
    );
  }
}
