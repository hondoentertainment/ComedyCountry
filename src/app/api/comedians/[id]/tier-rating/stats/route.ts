import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

const VALID_TIERS = ["S", "A", "B", "C", "D", "F"] as const;

// GET: Public tier distribution stats for a comedian
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(
    `comedians-tier-stats:${getRateLimitKey(request)}`,
    { limit: 60, windowSeconds: 60 },
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { id: comedianId } = await params;
  if (!comedianId) {
    return NextResponse.json({ error: "Missing comedian ID" }, { status: 400 });
  }

  try {
    const ratings = await prisma.comedianTierRating.groupBy({
      by: ["tier"],
      where: { comedianId },
      _count: true,
    });

    const distribution: Record<string, number> = {};
    let total = 0;
    for (const tier of VALID_TIERS) {
      const found = ratings.find((r) => r.tier === tier);
      distribution[tier] = found?._count ?? 0;
      total += distribution[tier];
    }

    return NextResponse.json({ comedianId, distribution, total });
  } catch {
    return NextResponse.json(
      { error: "Failed to load stats" },
      { status: 500 },
    );
  }
}
