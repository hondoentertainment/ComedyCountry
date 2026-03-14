import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getComedianForUser, getRevenueStats } from "@/lib/creator";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const comedian = await getComedianForUser(session.user.id);
  if (!comedian) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const stats = await getRevenueStats(comedian.id);
    return NextResponse.json(stats);
  } catch {
    return NextResponse.json({ error: "Failed to fetch revenue stats" }, { status: 500 });
  }
}
