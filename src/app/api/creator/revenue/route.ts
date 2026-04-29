import { NextResponse } from "next/server";
import { requireCreator } from "@/lib/admin";
import { getRevenueStats } from "@/lib/creator";

export async function GET() {
  const auth = await requireCreator();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status });
  }

  try {
    const stats = await getRevenueStats(auth.comedian.id);
    return NextResponse.json(stats);
  } catch {
    return NextResponse.json({ error: "Failed to fetch revenue stats" }, { status: 500 });
  }
}
