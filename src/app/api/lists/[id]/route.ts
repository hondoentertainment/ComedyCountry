import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(`lists:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { id } = await params;
  const session = await getServerSession(authOptions);

  const list = await prisma.comedyList.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, profileName: true, name: true, username: true, image: true } },
      items: {
        orderBy: { sortOrder: "asc" },
      },
      _count: { select: { items: true, saves: true } },
    },
  });

  if (!list) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!list.isPublic && list.userId !== session?.user?.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Resolve items to their entities
  const comedianIds = list.items.filter((i) => i.comedianId).map((i) => i.comedianId!);
  const eventIds = list.items.filter((i) => i.eventId).map((i) => i.eventId!);
  const venueIds = list.items.filter((i) => i.venueId).map((i) => i.venueId!);

  const [comedians, events, venues] = await Promise.all([
    comedianIds.length > 0
      ? prisma.comedian.findMany({
          where: { id: { in: comedianIds } },
          select: { id: true, name: true, slug: true, headshotUrl: true, touringStatus: true },
        })
      : [],
    eventIds.length > 0
      ? prisma.event.findMany({
          where: { id: { in: eventIds } },
          include: { venue: { select: { name: true, city: true, state: true } }, comedians: { include: { comedian: { select: { name: true } } } } },
        })
      : [],
    venueIds.length > 0
      ? prisma.venue.findMany({
          where: { id: { in: venueIds } },
          select: { id: true, name: true, city: true, state: true, type: true },
        })
      : [],
  ]);

  let userSaved = false;
  if (session?.user?.id) {
    const save = await prisma.comedyListSave.findUnique({
      where: { userId_listId: { userId: session.user.id, listId: id } },
    });
    userSaved = !!save;
  }

  return NextResponse.json({
    list,
    entities: {
      comedians: Object.fromEntries(comedians.map((c) => [c.id, c])),
      events: Object.fromEntries(events.map((e) => [e.id, e])),
      venues: Object.fromEntries(venues.map((v) => [v.id, v])),
    },
    userSaved,
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(`lists:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const list = await prisma.comedyList.findUnique({ where: { id } });
  if (!list || list.userId !== session.user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await prisma.comedyList.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
