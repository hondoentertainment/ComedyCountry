import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRecommendedComedians, getRecommendedEvents } from "@/lib/recommendations";

/**
 * GET - Personalized recommendations based on user's taste profile.
 * Query params:
 *   type: "comedians" | "events" | "all" (default: "all")
 *   limit: number (default: 12, max: 30)
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "all";
  const limit = Math.min(parseInt(searchParams.get("limit") || "12", 10), 30);

  try {
    const result: Record<string, unknown> = {};

    if (type === "all" || type === "comedians") {
      result.comedians = await getRecommendedComedians(session.user.id, limit);
    }

    if (type === "all" || type === "events") {
      result.events = await getRecommendedEvents(session.user.id, limit);
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (err) {
    console.error("Recommendations error:", err);
    return NextResponse.json({ comedians: [], events: [] });
  }
}
