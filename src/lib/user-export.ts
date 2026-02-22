import { prisma } from "@/lib/prisma";

/**
 * Build GDPR-compliant user data export for a given user ID.
 */
export async function buildUserExport(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      followsComedians: {
        include: {
          comedian: {
            select: {
              id: true,
              name: true,
              slug: true,
              headshotUrl: true,
              bio: true,
              website: true,
              touringStatus: true,
            },
          },
        },
      },
      followsVenues: {
        include: {
          venue: {
            select: {
              id: true,
              name: true,
              address: true,
              city: true,
              state: true,
              type: true,
              website: true,
            },
          },
        },
      },
      eventReviews: {
        include: {
          event: {
            select: {
              id: true,
              date: true,
              showtime: true,
              title: true,
              venue: {
                select: { name: true, city: true, state: true },
              },
            },
          },
        },
      },
      comedianTierRatings: {
        include: {
          comedian: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
    },
  });

  if (!user) return null;

  return {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      name: user.name,
      profileName: user.profileName,
      email: user.email,
      image: user.image,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
    favoriteComedians: user.followsComedians.map((f) => ({
      ...f.comedian,
      followedAt: f.createdAt.toISOString(),
    })),
    savedVenues: user.followsVenues.map((f) => ({
      ...f.venue,
      followedAt: f.createdAt.toISOString(),
    })),
    eventReviews: user.eventReviews.map((r) => ({
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      event: {
        ...r.event,
        date: r.event.date.toISOString(),
      },
    })),
    comedianTierRatings: user.comedianTierRatings.map((r) => ({
      tier: r.tier,
      comedian: r.comedian,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}
