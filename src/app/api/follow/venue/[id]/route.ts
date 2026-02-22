import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: venueId } = await params;
  if (!venueId) {
    return NextResponse.json({ error: "Missing venue ID" }, { status: 400 });
  }

  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
  });
  if (!venue) {
    return NextResponse.json({ error: "Venue not found" }, { status: 404 });
  }

  const existing = await prisma.venueFollow.findUnique({
    where: {
      userId_venueId: { userId: session.user.id, venueId },
    },
  });

  if (existing) {
    await prisma.venueFollow.delete({
      where: { id: existing.id },
    });
    return NextResponse.json({ following: false });
  }

  await prisma.venueFollow.create({
    data: {
      userId: session.user.id,
      venueId,
    },
  });
  return NextResponse.json({ following: true });
}
