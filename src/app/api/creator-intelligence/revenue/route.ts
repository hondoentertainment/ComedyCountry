import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getComedianForUser } from "@/lib/creator";
import { attributeRevenue, getRevenueAttribution } from "@/lib/creator-intelligence";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`creator-intelligence-revenue:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const comedian = await getComedianForUser(session.user.id);
  if (!comedian) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const dateRange =
      from && to ? { from: new Date(from), to: new Date(to) } : undefined;

    const data = await getRevenueAttribution(comedian.id, dateRange);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch revenue attribution" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(`creator-intelligence-revenue:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const comedian = await getComedianForUser(session.user.id);
  if (!comedian) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { sourceType, sourceId, revenueType, amount } = body;

    if (!sourceType || !revenueType || typeof amount !== "number") {
      return NextResponse.json(
        { error: "sourceType, revenueType, and amount are required" },
        { status: 400 },
      );
    }

    const record = await attributeRevenue(comedian.id, {
      sourceType,
      sourceId,
      revenueType,
      amount,
    });

    return NextResponse.json(record, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to record attribution" }, { status: 500 });
  }
}
