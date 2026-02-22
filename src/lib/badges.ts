import { prisma } from "./prisma";

export type ComedianBadge = {
  comedianId: string;
  comedianName: string;
  comedianSlug: string;
  headshotUrl: string | null;
  roundCount: number;
  /** Earned by seeing comedian once (1+ rounds) */
  firstTime: boolean;
  /** Earned by seeing comedian in 2+ different shows */
  multiRound: boolean;
  /** Event IDs where user saw this comedian (for display) */
  eventIds: string[];
};

export async function getUserComedianBadges(userId: string): Promise<ComedianBadge[]> {
  const reviews = await prisma.eventReview.findMany({
    where: { userId },
    include: {
      event: {
        include: {
          comedians: {
            include: {
              comedian: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  headshotUrl: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const byComedian = new Map<
    string,
    { comedian: { id: string; name: string; slug: string; headshotUrl: string | null }; eventIds: Set<string> }
  >();

  for (const review of reviews) {
    for (const ec of review.event.comedians) {
      const c = ec.comedian;
      const existing = byComedian.get(c.id);
      if (existing) {
        existing.eventIds.add(review.eventId);
      } else {
        byComedian.set(c.id, {
          comedian: c,
          eventIds: new Set([review.eventId]),
        });
      }
    }
  }

  const badges: ComedianBadge[] = [];
  for (const [, { comedian, eventIds }] of Array.from(byComedian.entries())) {
    const roundCount = eventIds.size;
    badges.push({
      comedianId: comedian.id,
      comedianName: comedian.name,
      comedianSlug: comedian.slug,
      headshotUrl: comedian.headshotUrl,
      roundCount,
      firstTime: roundCount >= 1,
      multiRound: roundCount >= 2,
      eventIds: Array.from(eventIds),
    });
  }

  badges.sort((a, b) => b.roundCount - a.roundCount);
  return badges;
}

/** Get badge info for a single comedian (for use on comedian detail page) */
export async function getUserBadgeForComedian(
  userId: string,
  comedianId: string
): Promise<ComedianBadge | null> {
  const badges = await getUserComedianBadges(userId);
  return badges.find((b) => b.comedianId === comedianId) ?? null;
}
