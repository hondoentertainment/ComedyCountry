import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchChannelStats } from "@/lib/youtube";

/**
 * POST /api/youtube/sync
 * Syncs subscriberCount and videoCount for all YouTube channels.
 * Requires YOUTUBE_API_KEY in environment.
 *
 * Security: Set YOUTUBE_SYNC_API_KEY to require "Authorization: Bearer <key>"
 * or "X-API-Key: <key>" header. If unset, endpoint is unprotected (dev only).
 */
export async function POST(request: Request) {
  const apiKey = process.env.YOUTUBE_SYNC_API_KEY;
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && !apiKey) {
    return NextResponse.json(
      { error: "YOUTUBE_SYNC_API_KEY required in production" },
      { status: 503 }
    );
  }

  if (apiKey) {
    const authHeader = request.headers.get("authorization");
    const xApiKey = request.headers.get("x-api-key");
    const provided = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : xApiKey;
    if (provided !== apiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!process.env.YOUTUBE_API_KEY) {
    return NextResponse.json(
      { error: "YOUTUBE_API_KEY not configured" },
      { status: 503 }
    );
  }

  const channels = await prisma.youTubeChannel.findMany();
  const results = { synced: 0, failed: 0, skipped: 0 };

  for (const ch of channels) {
    try {
      const stats = await fetchChannelStats(ch.channelId);
      if (!stats) {
        results.skipped++;
        continue;
      }

      await prisma.youTubeChannel.update({
        where: { id: ch.id },
        data: {
          channelId: stats.channelId,
          subscriberCount: stats.subscriberCount,
          videoCount: stats.videoCount,
          lastSyncedAt: new Date(),
        },
      });
      results.synced++;
    } catch (err) {
      console.error(`[youtube] Sync failed for ${ch.channelId}:`, err);
      results.failed++;
    }
  }

  return NextResponse.json({
    total: channels.length,
    ...results,
  });
}
