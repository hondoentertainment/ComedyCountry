import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createHmac, timingSafeEqual } from "crypto";
import { generateUserCalendarFeed } from "@/lib/calendar-sync";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const TOKEN_SEPARATOR = ":";
const DEFAULT_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

function getSecret(): string {
  const secret =
    process.env.CALENDAR_FEED_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret)
    throw new Error("CALENDAR_FEED_SECRET or NEXTAUTH_SECRET required");
  return secret;
}

/**
 * Create a signed token for calendar feed subscription.
 * Format: base64url(userId:expiry:signature)
 */
export function createCalendarFeedToken(userId: string): string {
  const expiry = Date.now() + DEFAULT_EXPIRY_MS;
  const payload = `${userId}${TOKEN_SEPARATOR}${expiry}`;
  const sig = createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");
  return Buffer.from(`${payload}${TOKEN_SEPARATOR}${sig}`).toString(
    "base64url",
  );
}

function verifyCalendarFeedToken(token: string): { userId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(TOKEN_SEPARATOR);
    if (parts.length !== 3) return null;
    const [userId, expiryStr, sig] = parts;
    const expiry = parseInt(expiryStr, 10);
    if (isNaN(expiry) || Date.now() > expiry) return null;

    const payload = `${userId}${TOKEN_SEPARATOR}${expiry}`;
    const expected = createHmac("sha256", getSecret())
      .update(payload)
      .digest("base64url");
    const sigBuf = Buffer.from(sig, "base64url");
    const expBuf = Buffer.from(expected, "base64url");
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf))
      return null;

    return { userId };
  } catch {
    return null;
  }
}

/**
 * GET /api/calendar-feed?token=xxx
 * Returns iCal feed for the user identified by the signed token.
 * Used by Google Calendar, Apple Calendar, etc. for subscription.
 */
export async function GET(req: NextRequest) {
  const rl = await checkRateLimit(`calendar-feed:${getRateLimitKey(req)}`, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  const parsed = verifyCalendarFeedToken(token);
  if (!parsed) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 },
    );
  }

  try {
    const feed = await generateUserCalendarFeed(parsed.userId);
    return new NextResponse(feed, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="my-comedy-shows.ics"',
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    logger.error(
      "Calendar feed error",
      {},
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json(
      { error: "Failed to generate feed" },
      { status: 500 },
    );
  }
}
