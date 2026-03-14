import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchChannelStats } from "@/lib/youtube";
import { applyRateLimit, getClientAddress, jsonError, jsonResponse, logError, logInfo } from "@/lib/api";

/**
 * POST /api/youtube/sync
 * Syncs subscriberCount and videoCount for all YouTube channels.
 * Requires YOUTUBE_API_KEY in environment.
 *
 * Security: Set YOUTUBE_SYNC_API_KEY to require "Authorization: Bearer <key>"
 * or "X-API-Key: <key>" header. If unset, endpoint is unprotected (dev only).
 */
export async function POST(request: Request) {
  const rateLimit = applyRateLimit(request, getClientAddress(request), {
    prefix: "youtube-sync",
    limit: 5,
    windowMs: 60 * 1000,
  });
  if (rateLimit) return rateLimit;

  const apiKey = process.env.YOUTUBE_SYNC_API_KEY;
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && !apiKey) {
    return jsonError(request, 503, "YOUTUBE_SYNC_API_KEY required in production");
  }

  if (apiKey) {
    const authHeader = request.headers.get("authorization");
    const xApiKey = request.headers.get("x-api-key");
    const provided = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : xApiKey;
    if (provided !== apiKey) {
      return jsonError(request, 401, "Unauthorized");
    }
  }

  if (!process.env.YOUTUBE_API_KEY) {
    return jsonError(request, 503, "YOUTUBE_API_KEY not configured");
  }

  const channels = await prisma.youTubeChannel.findMany();
  const results = { synced: 0, failed: 0, skipped: 0 };
  logInfo(request, "Starting YouTube sync", { channels: channels.length });

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
      logError(request, "YouTube sync failed for channel", err, {
        channelId: ch.channelId,
      });
      results.failed++;
    }
  }

  return jsonResponse(request, {
    total: channels.length,
    ...results,
  });
}
