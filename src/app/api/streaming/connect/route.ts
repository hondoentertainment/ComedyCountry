import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  connectStreamingPlatform,
  disconnectStreamingPlatform,
  getStreamingConnections,
} from "@/lib/streaming-sync";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`streaming-connect:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const connections = await getStreamingConnections(session.user.id);
    return NextResponse.json({ connections });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get connections";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit(`streaming-connect:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { platform, platformUserId, accessToken, refreshToken } = body;

    if (!platform || !platformUserId || !accessToken) {
      return NextResponse.json(
        { error: "platform, platformUserId, and accessToken are required" },
        { status: 400 }
      );
    }

    if (!["SPOTIFY", "APPLE_MUSIC"].includes(platform)) {
      return NextResponse.json(
        { error: "platform must be SPOTIFY or APPLE_MUSIC" },
        { status: 400 }
      );
    }

    const connection = await connectStreamingPlatform(
      session.user.id,
      platform,
      { platformUserId, accessToken, refreshToken }
    );

    return NextResponse.json(connection, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to connect";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const rl = await checkRateLimit(`streaming-connect:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");

    if (!platform || !["SPOTIFY", "APPLE_MUSIC"].includes(platform)) {
      return NextResponse.json(
        { error: "Valid platform is required" },
        { status: 400 }
      );
    }

    await disconnectStreamingPlatform(
      session.user.id,
      platform as "SPOTIFY" | "APPLE_MUSIC"
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to disconnect";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
