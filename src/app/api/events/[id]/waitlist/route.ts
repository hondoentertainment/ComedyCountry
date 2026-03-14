import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    return NextResponse.json({ onWaitlist: true });
  } catch {
    return NextResponse.json({ error: "Waitlist service unavailable" }, { status: 503 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
