import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // id here is the slug
  const comedian = await prisma.comedian.findUnique({
    where: { slug: id },
    include: {
      genres: { select: { genre: true } },
      _count: { select: { followers: true, events: true } },
      specialReleases: { select: { id: true } },
      tierRatings: { select: { tier: true } },
    },
  });

  if (!comedian) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Calculate average tier
  const tierOrder = ["S", "A", "B", "C", "D", "F"];
  let avgTier: string | null = null;
  if (comedian.tierRatings.length > 0) {
    const avg = comedian.tierRatings.reduce((sum, r) => sum + tierOrder.indexOf(r.tier), 0) / comedian.tierRatings.length;
    avgTier = tierOrder[Math.round(avg)] || null;
  }

  return NextResponse.json({
    id: comedian.id,
    name: comedian.name,
    slug: comedian.slug,
    headshotUrl: comedian.headshotUrl,
    bio: comedian.bio,
    touringStatus: comedian.touringStatus,
    genres: comedian.genres,
    _count: comedian._count,
    specialCount: comedian.specialReleases.length,
    avgTier,
  });
}
