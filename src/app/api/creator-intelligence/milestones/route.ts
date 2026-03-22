import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getComedianForUser } from "@/lib/creator";
import { getCareerTimeline, recordCareerMilestone, checkMilestones } from "@/lib/creator-intelligence";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`creator-intelligence-milestones:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
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
    const autoDetect = searchParams.get("autoDetect") === "true";

    if (autoDetect) {
      const detected = await checkMilestones(comedian.id);
      return NextResponse.json({ detected });
    }

    const timeline = await getCareerTimeline(comedian.id);
    return NextResponse.json(timeline);
  } catch {
    return NextResponse.json({ error: "Failed to fetch milestones" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(`creator-intelligence-milestones:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
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
    const { milestone, metric, value, previousBest } = body;

    if (!milestone || !metric || typeof value !== "number") {
      return NextResponse.json(
        { error: "milestone, metric, and value are required" },
        { status: 400 },
      );
    }

    const record = await recordCareerMilestone(comedian.id, {
      milestone,
      metric,
      value,
      previousBest,
    });

    return NextResponse.json(record, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to record milestone" }, { status: 500 });
  }
}
