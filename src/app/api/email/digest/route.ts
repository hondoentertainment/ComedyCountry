import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, digestEmailHtml } from "@/lib/email";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * POST /api/email/digest
 * Trigger email digest for all users who opted in.
 * Protected by CRON_SECRET to be called from a scheduled job.
 */
export async function POST(request: Request) {
  const rl = await checkRateLimit(`email-digest:${getRateLimitKey(request)}`, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find users with email digest enabled
    const prefs = await prisma.notificationPreference.findMany({
      where: { emailDigest: { not: "off" } },
      select: { userId: true, emailDigest: true },
    });

    if (prefs.length === 0) {
      return NextResponse.json({
        sent: 0,
        message: "No users with digest enabled",
      });
    }

    const userIds = prefs.map((p) => p.userId);

    // Get users with emails
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, email: { not: null } },
      select: { id: true, email: true, name: true, profileName: true },
    });

    // Get unread notifications from the past week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    let sent = 0;
    const baseUrl =
      process.env.NEXTAUTH_URL || "https://punchline-atlas.vercel.app";

    for (const user of users) {
      if (!user.email) continue;

      const notifications = await prisma.notification.findMany({
        where: { userId: user.id, read: false, createdAt: { gte: weekAgo } },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      if (notifications.length === 0) continue;

      const items = notifications.map((n) => ({
        title: n.title,
        message: n.message,
        url: n.eventId ? `${baseUrl}/events/${n.eventId}` : undefined,
      }));

      const displayName = user.profileName || user.name || "comedy fan";
      const html = digestEmailHtml(displayName, items);

      const ok = await sendEmail({
        to: user.email,
        subject: `${notifications.length} updates from Punchline Atlas`,
        html,
        text: items.map((i) => `${i.title}: ${i.message}`).join("\n"),
      });

      if (ok) sent++;
    }

    return NextResponse.json({ sent, total: users.length });
  } catch (err) {
    logger.error("[DIGEST]", {}, err instanceof Error ? err : undefined);
    return NextResponse.json(
      { error: "Failed to send digests" },
      { status: 500 },
    );
  }
}
