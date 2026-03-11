import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { comedianId: string } },
) {
  try {
    const comedian = await prisma.comedian.findUnique({
      where: { id: params.comedianId },
      include: {
        genres: true,
        socialLinks: true,
        specialReleases: { orderBy: { releaseDate: "desc" }, take: 10 },
        events: {
          include: { event: { select: { id: true, title: true, date: true } } },
          orderBy: { event: { date: "desc" } },
          take: 10,
        },
      },
    });

    if (!comedian) {
      return NextResponse.json({ error: "Comedian not found" }, { status: 404 });
    }

    // Aggregate stats
    const [followerCount, tipCount, eventCount] = await Promise.all([
      prisma.comedianFollow.count({ where: { comedianId: comedian.id } }),
      prisma.fanTip.count({ where: { comedianId: comedian.id } }),
      prisma.eventComedian.count({ where: { comedianId: comedian.id } }),
    ]);

    // Get top-rated tier ratings
    let avgRating: number | null = null;
    let ratingCount = 0;
    try {
      const tierAgg = await prisma.comedianTierRating.aggregate({
        where: { comedianId: comedian.id },
        _avg: { rating: true },
        _count: true,
      });
      avgRating = tierAgg._avg.rating;
      ratingCount = tierAgg._count;
    } catch {
      // tier rating table may not exist
    }

    // Exclusive content clips (non-gated only)
    const clips = await prisma.exclusiveContent.findMany({
      where: { comedianId: comedian.id, isGated: false, mediaUrl: { not: null } },
      orderBy: { publishedAt: "desc" },
      take: 5,
      select: { id: true, title: true, mediaUrl: true, mediaType: true, publishedAt: true },
    });

    const pressKit = {
      comedian: {
        id: comedian.id,
        name: comedian.name,
        slug: comedian.slug,
        headshotUrl: comedian.headshotUrl,
        bio: comedian.bio,
        yearsActiveFrom: comedian.yearsActiveFrom,
        yearsActiveTo: comedian.yearsActiveTo,
        representation: comedian.representation,
        touringStatus: comedian.touringStatus,
        website: comedian.website,
      },
      genres: comedian.genres,
      socialLinks: comedian.socialLinks,
      specials: comedian.specialReleases,
      recentShows: comedian.events.map((ec) => ec.event),
      clips,
      stats: {
        followers: followerCount,
        totalShows: eventCount,
        tips: tipCount,
        avgRating,
        ratingCount,
      },
    };

    return NextResponse.json(pressKit);
  } catch {
    return NextResponse.json({ error: "Failed to generate press kit" }, { status: 500 });
  }
}
