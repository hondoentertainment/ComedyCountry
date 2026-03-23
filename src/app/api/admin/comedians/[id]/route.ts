import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(`admin-comedians-id:${getRateLimitKey(_request)}`, { limit: 120, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const { id } = await params;
  const comedian = await prisma.comedian.findUnique({
    where: { id },
    include: {
      genres: true,
      socialLinks: true,
      specialReleases: true,
      podcastLinks: true,
      youtubeChannel: true,
      _count: { select: { events: true, followers: true } },
    },
  });

  if (!comedian) {
    return NextResponse.json({ error: "Comedian not found" }, { status: 404 });
  }

  return NextResponse.json(comedian);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(`admin-comedians-id:${getRateLimitKey(request)}`, { limit: 120, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, bio, headshotUrl, touringStatus, website, yearsActiveFrom, yearsActiveTo, representation, genres } = body;

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (bio !== undefined) updateData.bio = bio || null;
  if (headshotUrl !== undefined) updateData.headshotUrl = headshotUrl || null;
  if (touringStatus !== undefined) updateData.touringStatus = touringStatus;
  if (website !== undefined) updateData.website = website || null;
  if (yearsActiveFrom !== undefined) updateData.yearsActiveFrom = yearsActiveFrom ? parseInt(yearsActiveFrom, 10) : null;
  if (yearsActiveTo !== undefined) updateData.yearsActiveTo = yearsActiveTo ? parseInt(yearsActiveTo, 10) : null;
  if (representation !== undefined) updateData.representation = representation || null;

  // Update genres if provided
  if (genres !== undefined) {
    await prisma.comedianGenre.deleteMany({ where: { comedianId: id } });
    if (genres.length > 0) {
      await prisma.comedianGenre.createMany({
        data: genres.map((g: string) => ({ comedianId: id, genre: g })),
      });
    }
  }

  const comedian = await prisma.comedian.update({
    where: { id },
    data: updateData,
    include: { genres: true },
  });

  return NextResponse.json(comedian);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(`admin-comedians-id:${getRateLimitKey(_request)}`, { limit: 120, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  const { id } = await params;
  await prisma.comedian.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
