import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getComedyPassportSummary } from "@/lib/comedy-passport";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(
    `comedy-passport:${getRateLimitKey(request)}`,
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

    const passport = await getComedyPassportSummary(session.user.id);
    return NextResponse.json(passport, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (error) {
    logger.error(
      "Comedy passport GET error",
      {},
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to fetch comedy passport" },
      { status: 500 },
    );
  }
}
