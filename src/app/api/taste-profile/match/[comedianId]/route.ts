import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getTasteMatchScore,
  computeTasteProfile,
  getTasteProfile,
} from "@/lib/taste-profile";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * GET - Get taste match percentage for a comedian.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ comedianId: string }> },
) {
  const rl = await checkRateLimit(
    `taste-profile-match:${getRateLimitKey(request)}`,
    { limit: 60, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { comedianId } = await params;
    if (!comedianId) {
      return NextResponse.json(
        { error: "Missing comedian ID" },
        { status: 400 },
      );
    }

    // Ensure profile exists
    const existing = await getTasteProfile(session.user.id);
    if (!existing) {
      await computeTasteProfile(session.user.id);
    }

    const result = await getTasteMatchScore(session.user.id, comedianId);

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=600" },
    });
  } catch (err) {
    logger.error(
      "Taste match error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to compute taste match" },
      { status: 500 },
    );
  }
}
