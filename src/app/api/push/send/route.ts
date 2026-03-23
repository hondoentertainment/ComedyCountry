import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * POST /api/push/send - Send a push notification (admin only, or system use)
 */
export async function POST(request: Request) {
  const rl = await checkRateLimit(`push-send:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  // Allow CRON_SECRET or admin auth
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  let isAuthorized = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isAuthorized) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    isAuthorized = user?.role === "admin";
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { userId, title, body: pushBody, url } = body;

  if (!userId || !title || !pushBody) {
    return NextResponse.json({ error: "userId, title, and body required" }, { status: 400 });
  }

  const sent = await sendPushToUser(userId, {
    title,
    body: pushBody,
    url: url || undefined,
    icon: "/icon.svg",
  });

  return NextResponse.json({ sent });
}
