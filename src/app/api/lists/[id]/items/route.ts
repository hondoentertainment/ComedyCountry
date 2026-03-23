import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(`lists-items:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
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

  const body = await request.json();
  const { comedianId, eventId, venueId, note } = body;

  if (!comedianId && !eventId && !venueId) {
    return NextResponse.json({ error: "Must specify an entity" }, { status: 400 });
  }

  const maxOrder = await prisma.comedyListItem.aggregate({
    where: { listId: id },
    _max: { sortOrder: true },
  });

  const item = await prisma.comedyListItem.create({
    data: {
      listId: id,
      comedianId: comedianId || null,
      eventId: eventId || null,
      venueId: venueId || null,
      note: note || null,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(`lists-items:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
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

  const body = await request.json();
  await prisma.comedyListItem.delete({ where: { id: body.itemId } });

  return NextResponse.json({ success: true });
}
