import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getComedianForUser } from "@/lib/creator";
import { getViewTrends } from "@/lib/creator-analytics";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const comedian = await getComedianForUser(session.user.id);
  if (!comedian) {
    return NextResponse.json({ error: "No approved comedian profile" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get("period") ?? "daily") as "daily" | "weekly" | "monthly";
  const days = Math.min(365, Math.max(1, parseInt(searchParams.get("days") ?? "30", 10)));

  try {
    const trends = await getViewTrends(comedian.id, period, days);
    return NextResponse.json({ trends, period, days });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch view trends";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
