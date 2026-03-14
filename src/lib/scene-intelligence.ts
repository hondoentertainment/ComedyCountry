import { prisma } from "@/lib/prisma";
import {
  addWeightedAttributes,
  emptyAttributeScores,
  getAttributeLabel,
  getTopKeys,
  normalizeAttributeScores,
} from "@/lib/comedy-genome";

export interface SceneIntelligence {
  city: string;
  state: string;
  slug: string;
  sceneScore: number;
  momentumScore: number;
  loyaltyScore: number;
  varietyScore: number;
  avgTicketPrice: number;
  activeVenues: number;
  upcomingShows: number;
  topAttributes: string[];
  topAttributeLabels: string[];
  featuredComedians: Array<{ slug: string; name: string; appearances: number }>;
  monetizationHint: string;
}

function slugifyCity(city: string): string {
  return city.trim().toLowerCase().replace(/\s+/g, "-");
}

export async function getSceneIntelligenceBySlug(
  citySlug: string,
): Promise<SceneIntelligence | null> {
  const venue = await prisma.venue.findFirst({
    where: {
      city: { contains: citySlug.replace(/-/g, " "), mode: "insensitive" },
    },
    select: { city: true, state: true },
  });

  if (!venue?.city || !venue.state) {
    return null;
  }

  return computeSceneIntelligence(venue.city, venue.state);
}

export async function computeSceneIntelligence(
  city: string,
  state: string,
): Promise<SceneIntelligence> {
  const venues = await prisma.venue.findMany({
    where: {
      city: { equals: city, mode: "insensitive" },
      state: { equals: state, mode: "insensitive" },
    },
    select: {
      id: true,
      name: true,
      followers: { select: { id: true } },
      events: {
        select: {
          id: true,
          date: true,
          priceMin: true,
          reviews: { select: { rating: true, verifiedAttendance: true } },
          attendees: { select: { id: true } },
          comedians: {
            select: {
              comedian: {
                select: {
                  slug: true,
                  name: true,
                  genres: { select: { genre: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const now = new Date();
  const upcomingEvents = venues.flatMap((venue) =>
    venue.events.filter((event) => event.date >= now),
  );
  const pastEvents = venues.flatMap((venue) =>
    venue.events.filter((event) => event.date < now),
  );

  const attributeScores = emptyAttributeScores();
  const comedianCounts = new Map<string, { slug: string; name: string; appearances: number }>();
  const followerCount = venues.reduce(
    (sum, venue) => sum + venue.followers.length,
    0,
  );
  const avgTicketPriceValues = upcomingEvents
    .map((event) => Number(event.priceMin ?? 0))
    .filter((price) => price > 0);
  const verifiedReviewCount = pastEvents.reduce(
    (sum, event) =>
      sum + event.reviews.filter((review) => review.verifiedAttendance).length,
    0,
  );
  const totalAttendance = pastEvents.reduce(
    (sum, event) => sum + event.attendees.length,
    0,
  );

  for (const event of [...upcomingEvents, ...pastEvents]) {
    const genres = event.comedians.flatMap((entry) =>
      entry.comedian.genres.map((genre) => genre.genre),
    );
    addWeightedAttributes(attributeScores, genres, 1);

    for (const entry of event.comedians) {
      const existing =
        comedianCounts.get(entry.comedian.slug) ?? {
          slug: entry.comedian.slug,
          name: entry.comedian.name,
          appearances: 0,
        };
      existing.appearances += 1;
      comedianCounts.set(entry.comedian.slug, existing);
    }
  }

  const normalizedAttributes = normalizeAttributeScores(attributeScores);
  const topAttributes = getTopKeys(normalizedAttributes, 4);
  const varietyScore = Math.min(
    100,
    Math.round((Object.keys(normalizedAttributes).length / 8) * 100),
  );
  const momentumScore = Math.min(
    100,
    Math.round(
      upcomingEvents.length * 8 +
        Math.min(totalAttendance / 10, 20) +
        Math.min(followerCount / 10, 20),
    ),
  );
  const loyaltyScore = Math.min(
    100,
    Math.round(
      Math.min(verifiedReviewCount * 8, 50) +
        Math.min(totalAttendance / Math.max(pastEvents.length || 1, 1), 50),
    ),
  );
  const avgTicketPrice =
    avgTicketPriceValues.length > 0
      ? Math.round(
          (avgTicketPriceValues.reduce((sum, value) => sum + value, 0) /
            avgTicketPriceValues.length) *
            100,
        ) / 100
      : 0;
  const sceneScore = Math.min(
    100,
    Math.round(momentumScore * 0.4 + loyaltyScore * 0.35 + varietyScore * 0.25),
  );

  const slug = slugifyCity(city);
  const featuredComedians = Array.from(comedianCounts.values())
    .sort((a, b) => b.appearances - a.appearances)
    .slice(0, 5);

  const snapshot = {
    city,
    state,
    slug,
    sceneScore,
    momentumScore,
    loyaltyScore,
    varietyScore,
    avgTicketPrice,
    activeVenues: venues.length,
    upcomingShows: upcomingEvents.length,
    topAttributes,
    featuredComedians,
  };

  await prisma.sceneInsightSnapshot.upsert({
    where: { slug },
    create: snapshot,
    update: {
      ...snapshot,
      lastComputedAt: new Date(),
    },
  });

  return {
    ...snapshot,
    topAttributeLabels: topAttributes.map(getAttributeLabel),
    monetizationHint:
      followerCount >= 100
        ? "Strong audience depth for premium creator and venue intel."
        : "Growing scene with room to build premium routing and trend reports.",
  };
}
