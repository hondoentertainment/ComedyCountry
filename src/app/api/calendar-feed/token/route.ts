import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createCalendarFeedToken } from "../route";

/**
 * POST /api/calendar-feed/token
 * Generate a subscription token for the authenticated user.
 * Returns { token, url } for adding to calendar apps.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = createCalendarFeedToken(session.user.id);
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://punchlineatlas.com");
    const url = `${baseUrl.replace(/\/$/, "")}/api/calendar-feed?token=${token}`;

    return NextResponse.json({ token, url });
  } catch (err) {
    console.error("Calendar feed token error:", err);
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500 });
  }
}
