import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  recordPerformanceMetric,
  getComedianPerformanceReport,
} from "@/lib/analytics-engine";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const rl = await checkRateLimit(`analytics-performance:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const comedianId = searchParams.get("comedianId");

  if (!comedianId) {
    return NextResponse.json(
      { error: "comedianId is required" },
      { status: 400 }
    );
  }

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const dateRange =
    from || to
      ? {
          ...(from && { from: new Date(from) }),
          ...(to && { to: new Date(to) }),
        }
      : undefined;

  try {
    const report = await getComedianPerformanceReport(comedianId, dateRange);
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get performance report" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit(`analytics-performance:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { comedianId, eventId, bitTitle, laughScore, crowdReaction, audienceSize, city, date } = body;

    if (!comedianId || !eventId || !bitTitle || laughScore === undefined || !crowdReaction || !audienceSize || !city || !date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const metric = await recordPerformanceMetric({
      comedianId,
      eventId,
      bitTitle,
      laughScore,
      crowdReaction,
      audienceSize,
      city,
      date: new Date(date),
    });

    return NextResponse.json(metric, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record metric";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
