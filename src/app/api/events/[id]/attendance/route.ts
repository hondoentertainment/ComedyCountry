import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkAndAwardBadges } from "@/lib/badges.achievement";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  const [counts, userAttendance] = await Promise.all([
    prisma.eventAttendance.groupBy({
      by: ["status"],
      where: { eventId: id },
      _count: true,
    }),
    session?.user?.id
      ? prisma.eventAttendance.findUnique({
          where: { userId_eventId: { userId: session.user.id, eventId: id } },
        })
      : null,
  ]);

  const going = counts.find((c) => c.status === "going")?._count ?? 0;
  const interested = counts.find((c) => c.status === "interested")?._count ?? 0;

  return NextResponse.json({
    going,
    interested,
    userStatus: userAttendance?.status ?? null,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const status = body.status as string;

  if (!["going", "interested"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = await prisma.eventAttendance.findUnique({
    where: { userId_eventId: { userId: session.user.id, eventId: id } },
  });

  if (existing?.status === status) {
    // Toggle off
    await prisma.eventAttendance.delete({
      where: { id: existing.id },
    });
    return NextResponse.json({ userStatus: null });
  }

  await prisma.eventAttendance.upsert({
    where: { userId_eventId: { userId: session.user.id, eventId: id } },
    update: { status },
    create: { userId: session.user.id, eventId: id, status },
  });
  checkAndAwardBadges(session.user.id, "rsvp_event").catch(() => {});

  return NextResponse.json({ userStatus: status });
}
