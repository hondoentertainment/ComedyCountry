import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchChannelStats } from "@/lib/youtube";

/**
 * POST /api/youtube/sync
 * Syncs subscriberCount and videoCount for all YouTube channels.
 * Requires YOUTUBE_API_KEY in environment.
 */
export async function POST() {
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
