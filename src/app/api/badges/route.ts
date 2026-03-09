import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserBadges, BADGE_DEFINITIONS } from "@/lib/badges.achievement";

/**
 * GET /api/badges - Get user's earned badges or all badge definitions.
 * Query params:
 *   all=true  — return all badge definitions (for discovery)
 *   userId=X  — get badges for specific user (public profiles)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // All badge definitions
  if (searchParams.get("all") === "true") {
    return NextResponse.json({ badges: BADGE_DEFINITIONS });
  }

  // Specific user's badges
  const targetUserId = searchParams.get("userId");
  if (targetUserId) {
    try {
      const badges = await getUserBadges(targetUserId);
      return NextResponse.json({ badges });
    } catch {
      return NextResponse.json({ badges: [] });
    }
  }

  // Current user's badges
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const badges = await getUserBadges(session.user.id);
    return NextResponse.json({ badges });
  } catch {
    return NextResponse.json({ badges: [] });
  }
}
