import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status });
  }

  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      venue: true,
      comedians: { include: { comedian: true } },
      _count: { select: { reviews: true } },
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json(event);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status });
  }

  const { id } = await params;
  const body = await request.json();
  const { venueId, date, showtime, ticketUrl, priceMin, priceMax, showType, title, comedianIds } = body;

  const updateData: Record<string, unknown> = {};
  if (venueId !== undefined) updateData.venueId = venueId;
  if (date !== undefined) updateData.date = new Date(date);
  if (showtime !== undefined) updateData.showtime = showtime || null;
  if (ticketUrl !== undefined) updateData.ticketUrl = ticketUrl || null;
  if (priceMin !== undefined) updateData.priceMin = priceMin ? parseFloat(priceMin) : null;
  if (priceMax !== undefined) updateData.priceMax = priceMax ? parseFloat(priceMax) : null;
  if (showType !== undefined) updateData.showType = showType;
  if (title !== undefined) updateData.title = title || null;

  // Update comedian assignments if provided
  if (comedianIds !== undefined) {
    await prisma.eventComedian.deleteMany({ where: { eventId: id } });
    if (comedianIds.length > 0) {
      await prisma.eventComedian.createMany({
        data: comedianIds.map((cId: string, i: number) => ({
          eventId: id,
          comedianId: cId,
          role: i === 0 ? "headline" : "feature",
        })),
      });
    }
  }

  const event = await prisma.event.update({
    where: { id },
    data: updateData,
    include: {
      venue: true,
      comedians: { include: { comedian: true } },
    },
  });

  return NextResponse.json(event);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status });
  }

  const { id } = await params;
  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
