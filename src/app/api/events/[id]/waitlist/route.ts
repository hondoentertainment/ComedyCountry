import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, waitlistConfirmationHtml } from "@/lib/email";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * Event waitlist — users sign up to be notified when tickets become available.
 *
 * POST - Join/leave waitlist
 * GET  - Check waitlist status and count
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(`events-waitlist:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: eventId } = await params;

  try {
    // Toggle: if on waitlist, remove; if not, add
    const existing = await prisma.eventWaitlist.findUnique({
      where: { userId_eventId: { userId: session.user.id, eventId } },
    });

    if (existing) {
      await prisma.eventWaitlist.delete({ where: { id: existing.id } });
      return NextResponse.json({ onWaitlist: false });
    }

    await prisma.eventWaitlist.create({
      data: { userId: session.user.id, eventId },
    });

    // In-app notification
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        venue: true,
        comedians: { include: { comedian: true } },
      },
    });
    const eventTitle = event?.title ?? event?.comedians.map((ec) => ec.comedian.name).join(", ") ?? "Event";
    const venueName = event?.venue?.name ?? "the venue";
    const message = `You're on the waitlist for ${eventTitle} at ${venueName}. We'll notify you when tickets become available.`;

    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: "waitlist_joined",
        title: "You're on the waitlist",
        message,
        eventId,
      },
    });

    // Optional: brief confirmation email if user has email and emailDigest not off
    const [user, pref] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, name: true },
      }),
      prisma.notificationPreference.findUnique({
        where: { userId: session.user.id },
        select: { emailDigest: true },
      }),
    ]);
    const siteUrl = process.env.NEXTAUTH_URL ?? "https://punchline-atlas.vercel.app";
    const eventUrl = `${siteUrl}/events/${eventId}`;
    const userName = user?.name ?? "there";

    if (
      user?.email &&
      pref &&
      pref.emailDigest !== "off"
    ) {
      sendEmail({
        to: user.email,
        subject: "You're on the waitlist — Punchline Atlas",
        html: waitlistConfirmationHtml(userName, eventTitle, venueName, eventUrl),
        text: `You're on the waitlist for ${eventTitle} at ${venueName}. We'll notify you when tickets become available. View: ${eventUrl}`,
      }).catch(() => {
        // Non-blocking; log if needed
      });
    }

    return NextResponse.json({ onWaitlist: true });
  } catch {
    return NextResponse.json({ error: "Waitlist service unavailable" }, { status: 503 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(`events-waitlist:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { id: eventId } = await params;
  const session = await getServerSession(authOptions);

  try {
    const [count, userEntry] = await Promise.all([
      prisma.eventWaitlist.count({ where: { eventId } }),
      session?.user?.id
        ? prisma.eventWaitlist.findUnique({
            where: { userId_eventId: { userId: session.user.id, eventId } },
          })
        : null,
    ]);

    return NextResponse.json({
      count,
      onWaitlist: !!userEntry,
    });
  } catch {
    return NextResponse.json({ count: 0, onWaitlist: false });
  }
}
