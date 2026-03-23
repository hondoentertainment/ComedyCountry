import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(`comedians-similar:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { id } = await params;

  // Get the comedian's genres
  const comedian = await prisma.comedian.findUnique({
    where: { id },
    include: { genres: true },
  });

  if (!comedian) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const genres = comedian.genres.map((g) => g.genre);
  if (genres.length === 0) {
    // Fallback: return comedians with similar touring status
    const similar = await prisma.comedian.findMany({
      where: {
        id: { not: id },
        touringStatus: comedian.touringStatus,
      },
      take: 8,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        headshotUrl: true,
        touringStatus: true,
        genres: true,
        _count: { select: { followers: true } },
      },
    });
    return NextResponse.json({ similar }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  }

  // Find comedians who share the most genres
  const similar = await prisma.comedian.findMany({
    where: {
      id: { not: id },
      genres: { some: { genre: { in: genres } } },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      headshotUrl: true,
      touringStatus: true,
      genres: true,
      _count: { select: { followers: true } },
    },
  });

  // Score by number of shared genres
  const scored = similar.map((c) => {
    const sharedGenres = c.genres.filter((g) => genres.includes(g.genre)).length;
    return { ...c, score: sharedGenres };
  });

  scored.sort((a, b) => b.score - a.score || b._count.followers - a._count.followers);

  return NextResponse.json({ similar: scored.slice(0, 8) }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
