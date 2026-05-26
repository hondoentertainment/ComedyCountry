import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateReferralCode, getReferralStats } from "@/lib/marketing";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(
    `marketing-referrals:${getRateLimitKey(request)}`,
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

    const stats = await getReferralStats(session.user.id);
    return NextResponse.json(stats);
  } catch (error) {
    logger.error(
      "GET /api/marketing/referrals error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to fetch referral stats" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(
    `marketing-referrals:${getRateLimitKey(request)}`,
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

    const body = await request.json();
    const {
      eventId,
      venueId,
      discountType,
      discountValue,
      maxUses,
      expiresAt,
    } = body;

    const code = await generateReferralCode(session.user.id, {
      eventId,
      venueId,
      discountType,
      discountValue,
      maxUses,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    return NextResponse.json(code, { status: 201 });
  } catch (error) {
    logger.error(
      "POST /api/marketing/referrals error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to create referral code" },
      { status: 500 },
    );
  }
}
