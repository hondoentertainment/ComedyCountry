import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  syncStreamingData,
  getStreamingBasedRecommendations,
} from "@/lib/streaming-sync";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit(`streaming-sync:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { platform, listeningData } = body;

    if (!platform || !listeningData) {
      return NextResponse.json(
        { error: "platform and listeningData are required" },
        { status: 400 }
      );
    }

    if (!["SPOTIFY", "APPLE_MUSIC"].includes(platform)) {
      return NextResponse.json(
        { error: "platform must be SPOTIFY or APPLE_MUSIC" },
        { status: 400 }
      );
    }

    const result = await syncStreamingData(session.user.id, platform, listeningData);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const rl = await checkRateLimit(`streaming-sync:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") ?? "10", 10);

  try {
    const recommendations = await getStreamingBasedRecommendations(
      session.user.id,
      limit
    );
    return NextResponse.json({ recommendations });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get recommendations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
