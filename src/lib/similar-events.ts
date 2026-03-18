import { prisma } from "./prisma";

/**
 * Get similar events for discovery: same venue, same comedians, or similar genres.
 * Ordered by date asc, excludes current event, returns up to limit.
 */
export async function getSimilarEvents(eventId: string, limit = 4) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      venueId: true,
      date: true,
      comedians: {
        select: {
          comedianId: true,
          comedian: {
            select: {
              genres: { select: { genre: true } },
            },
          },
        },
      },
    },
  });

  if (!event) return [];

  const comedianIds = event.comedians.map((ec) => ec.comedianId);
  const genres = [
    ...new Set(
      event.comedians.flatMap((ec) =>
        ec.comedian.genres.map((g) => g.genre)
      )
    ),
  ];

  // Find events: same venue, same comedians, or comedians with overlapping genres
  // Use raw query for complex OR, or multiple findMany + merge
  const [byVenue, byComedian, byGenre] = await Promise.all([
    prisma.event.findMany({
      where: {
        id: { not: eventId },
        venueId: event.venueId,
        date: { gte: new Date() },
      },
      take: limit,
      orderBy: { date: "asc" },
      include: {
        venue: true,
        comedians: { include: { comedian: true } },
      },
    }),
    comedianIds.length > 0
      ? prisma.event.findMany({
          where: {
            id: { not: eventId },
            comedians: { some: { comedianId: { in: comedianIds } } },
            date: { gte: new Date() },
          },
          take: limit,
          orderBy: { date: "asc" },
          include: {
            venue: true,
            comedians: { include: { comedian: true } },
          },
        })
      : [],
    genres.length > 0
      ? prisma.event.findMany({
          where: {
            id: { not: eventId },
            comedians: {
              some: {
                comedian: {
                  genres: { some: { genre: { in: genres } } },
                },
              },
            },
            date: { gte: new Date() },
          },
          take: limit,
          orderBy: { date: "asc" },
          include: {
            venue: true,
            comedians: { include: { comedian: true } },
          },
        })
      : [],
  ]);

  // Merge, dedupe by id, preserve order: venue first, then comedian, then genre
  const seen = new Set<string>([eventId]);
  const result: typeof byVenue = [];
  for (const e of [...byVenue, ...byComedian, ...byGenre]) {
    if (!seen.has(e.id) && result.length < limit) {
      seen.add(e.id);
      result.push(e);
    }
  }

  return result.slice(0, limit);
}
