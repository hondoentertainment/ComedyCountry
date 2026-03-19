import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getComedianForUser } from "@/lib/creator";
import { getRevenueBreakdown } from "@/lib/creator-analytics";

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
  const months = Math.min(24, Math.max(1, parseInt(searchParams.get("months") ?? "6", 10)));

  try {
    const revenue = await getRevenueBreakdown(comedian.id, months);
    return NextResponse.json({ revenue, months });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch revenue data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
