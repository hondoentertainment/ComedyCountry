import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: { comedianId: string } },
) {
  const rl = await checkRateLimit(`creator-press-kit:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const comedian = await prisma.comedian.findUnique({
      where: { id: params.comedianId },
    });

    if (!comedian) {
      return NextResponse.json({ error: "Comedian not found" }, { status: 404 });
    }

    // Fetch related data separately for type safety
    const [genres, socialLinks, specialReleases, eventLinks] = await Promise.all([
      prisma.comedianGenre.findMany({ where: { comedianId: comedian.id } }),
      prisma.comedianSocialLink.findMany({ where: { comedianId: comedian.id } }),
      prisma.comedianSpecial.findMany({
        where: { comedianId: comedian.id },
        orderBy: { releaseYear: "desc" },
        take: 10,
      }),
      prisma.eventComedian.findMany({
        where: { comedianId: comedian.id },
        include: { event: { select: { id: true, title: true, date: true } } },
        orderBy: { event: { date: "desc" } },
        take: 10,
      }),
    ]);

    // Aggregate stats
    const [followerCount, tipCount, eventCount] = await Promise.all([
      prisma.comedianFollow.count({ where: { comedianId: comedian.id } }),
      prisma.fanTip.count({ where: { comedianId: comedian.id } }),
      prisma.eventComedian.count({ where: { comedianId: comedian.id } }),
    ]);

    // Get tier rating distribution
    let tierCount = 0;
    try {
      tierCount = await prisma.comedianTierRating.count({
        where: { comedianId: comedian.id },
      });
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
      genres,
      socialLinks,
      specials: specialReleases,
      recentShows: eventLinks.map((ec) => ec.event),
      clips,
      stats: {
        followers: followerCount,
        totalShows: eventCount,
        tips: tipCount,
        ratingCount: tierCount,
      },
    };

    return NextResponse.json(pressKit);
  } catch {
    return NextResponse.json({ error: "Failed to generate press kit" }, { status: 500 });
  }
}
