import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getRecommendedComedians,
  getRecommendedEvents,
} from "@/lib/recommendations";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import {
  scoreTasteMatch,
  buildGenreAffinityVector,
  rankBySimilarity,
  computeConfidence,
} from "@/lib/comedy-genome";
import { getTasteProfile, computeTasteProfile } from "@/lib/taste-profile";
import { logger } from "@/lib/logger";

/**
 * GET - Personalized recommendations based on user's taste profile.
 * Query params:
 *   type: "comedians" | "events" | "similar" | "taste" | "all" (default: "all")
 *   limit: number (default: 12, max: 30)
 *   comedianId: string (required for type=similar)
 */
export async function GET(request: NextRequest) {
  const rl = await checkRateLimit(getRateLimitKey(request), {
    limit: 30,
    windowSeconds: 60,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "all";
  const limit = Math.min(parseInt(searchParams.get("limit") || "12", 10), 30);
  const comedianId = searchParams.get("comedianId");
  const userId = session.user.id;

  try {
    const result: Record<string, unknown> = {};

    // Standard comedian recommendations
    if (type === "all" || type === "comedians") {
      result.comedians = await getRecommendedComedians(userId, limit);
    }

    // Standard event recommendations
    if (type === "all" || type === "events") {
      result.events = await getRecommendedEvents(userId, limit);
    }

    // Similar comedians (for "fans also like" widgets)
    if (type === "similar" && comedianId) {
      result.similar = await getSimilarComedians(comedianId, limit);
    }

    // Full taste profile with scored breakdown
    if (type === "taste") {
      result.tasteProfile = await getEnhancedTasteProfile(userId);
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (err) {
    logger.error(
      "Recommendations error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json({ comedians: [], events: [] });
  }
}

/**
 * Find comedians similar to a given comedian based on genre/attribute overlap.
 */
async function getSimilarComedians(comedianId: string, limit: number) {
  const [target, candidates] = await Promise.all([
    prisma.comedian.findUnique({
      where: { id: comedianId },
      select: {
        id: true,
        name: true,
        genres: { select: { genre: true } },
      },
    }),
    prisma.comedian.findMany({
      where: { id: { not: comedianId } },
      select: {
        id: true,
        name: true,
        slug: true,
        headshotUrl: true,
        genres: { select: { genre: true } },
        _count: { select: { followers: true } },
      },
      take: limit * 10,
    }),
  ]);

  if (!target) return [];

  const targetGenres = target.genres.map((g) => g.genre);

  const ranked = rankBySimilarity(
    targetGenres,
    candidates.map((c) => ({
      id: c.id,
      genres: c.genres.map((g) => g.genre),
    })),
  );

  const topIds = new Set(ranked.slice(0, limit).map((r) => r.id));
  const rankedMap = new Map(ranked.map((r) => [r.id, r]));

  return candidates
    .filter((c) => topIds.has(c.id))
    .map((c) => {
      const rank = rankedMap.get(c.id)!;
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        headshotUrl: c.headshotUrl,
        genres: c.genres.map((g) => g.genre),
        followerCount: c._count.followers,
        similarity: rank.similarity,
        sharedAttributes: rank.sharedAttributes,
      };
    })
    .sort((a, b) => b.similarity - a.similarity);
}

/**
 * Get an enhanced taste profile with detailed scoring breakdown,
 * confidence metrics, and comedy DNA summary.
 */
async function getEnhancedTasteProfile(userId: string) {
  // Ensure profile is computed
  let profile = await getTasteProfile(userId);
  if (!profile) {
    profile = await computeTasteProfile(userId);
  }

  // Gather raw signal counts for confidence calculation
  const [followCount, reviewCount, checkInCount, tierRatingCount] =
    await Promise.all([
      prisma.comedianFollow.count({ where: { userId } }),
      prisma.eventReview.count({ where: { userId } }),
      prisma.venueCheckIn.count({ where: { userId } }),
      prisma.comedianTierRating.count({ where: { userId } }),
    ]);

  const confidence = computeConfidence({
    follows: followCount,
    reviews: reviewCount,
    checkIns: checkInCount,
    tierRatings: tierRatingCount,
  });

  return {
    dimensions: profile.dimensions,
    topGenres: profile.topGenres,
    topAttributes: profile.topAttributes,
    attributeScores: profile.attributeScores,
    negativeSignals: profile.negativeSignals,
    profileSummary: profile.profileSummary,
    confidence,
    discoveryStretch: profile.discoveryStretch,
    profileVersion: profile.profileVersion,
    lastComputed: profile.lastComputed,
    signalCounts: {
      follows: followCount,
      reviews: reviewCount,
      checkIns: checkInCount,
      tierRatings: tierRatingCount,
    },
  };
}
