import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(`admin-venues:${getRateLimitKey(request)}`, { limit: 120, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const { id } = await params;
  const venue = await prisma.venue.findUnique({
    where: { id },
    include: { photos: true, socialLinks: true, _count: { select: { events: true } } },
  });

  if (!venue) {
    return NextResponse.json({ error: "Venue not found" }, { status: 404 });
  }

  return NextResponse.json(venue);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(`admin-venues:${getRateLimitKey(request)}`, { limit: 120, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, address, city, state, latitude, longitude, capacity, website, type } = body;

  const venue = await prisma.venue.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(address !== undefined && { address: address || null }),
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(latitude !== undefined && { latitude: latitude ? parseFloat(latitude) : null }),
      ...(longitude !== undefined && { longitude: longitude ? parseFloat(longitude) : null }),
      ...(capacity !== undefined && { capacity: capacity ? parseInt(capacity, 10) : null }),
      ...(website !== undefined && { website: website || null }),
      ...(type !== undefined && { type }),
    },
  });

  return NextResponse.json(venue);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(`admin-venues:${getRateLimitKey(request)}`, { limit: 120, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const { id } = await params;
  await prisma.venue.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
