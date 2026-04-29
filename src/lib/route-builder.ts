import { prisma } from "@/lib/prisma";
import { getRevenueBySource } from "@/lib/creator-intelligence";
import { getPodcastConversionStats, getTopConvertingEpisodes } from "@/lib/podcast-pipeline";
import { computeSceneIntelligence } from "@/lib/scene-intelligence";
import { TARGET_CITIES, type TargetCity } from "@/lib/target-cities";

export interface RouteVenueCandidate {
  id: string;
  name: string;
  type: string;
  capacity: number | null;
  upcomingShows: number;
  fairShows: number;
}

export interface RouteCandidate {
  city: TargetCity;
  score: number;
  audienceStrength: number;
  podcastLift: number;
  sceneScore: number;
  averageTicketPrice: number;
  routeReason: string;
  recommendedVenues: RouteVenueCandidate[];
}

export interface RouteBuilderReport {
  comedian: {
    id: string;
    name: string;
    genres: string[];
  };
  generatedAt: string;
  topRevenueSources: Array<{ source: string; total: number }>;
  podcastConversion: {
    totalClicks: number;
    totalPurchases: number;
    totalRevenue: number;
    conversionRate: number;
  };
  topEpisodes: Array<{ id: string; title: string; totalPurchases: number; totalRevenue: number }>;
  candidates: RouteCandidate[];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function readTopCities(topCities: unknown, targetCity: TargetCity) {
  if (!Array.isArray(topCities)) return 0;

  return topCities.reduce((count, item) => {
    if (typeof item === "string") {
      return item.toLowerCase().includes(targetCity.city.toLowerCase()) ? count + 1 : count;
    }

    if (
      item &&
      typeof item === "object" &&
      "city" in item &&
      typeof (item as { city?: unknown }).city === "string"
    ) {
      return (item as { city: string }).city.toLowerCase().includes(targetCity.city.toLowerCase())
        ? count + 1
        : count;
    }

    return count;
  }, 0);
}

function scoreRouteCandidate(input: {
  sceneScore: number;
  audienceStrength: number;
  podcastLift: number;
  venueDepth: number;
  fairCoverage: number;
  conflictPenalty: number;
}) {
  return round(
    input.sceneScore * 0.35 +
      input.audienceStrength * 0.25 +
      input.podcastLift * 0.15 +
      input.venueDepth * 0.15 +
      input.fairCoverage * 0.1 -
      input.conflictPenalty,
  );
}

export async function generateRouteBuilderReport(comedianId: string): Promise<RouteBuilderReport> {
  const comedian = await prisma.comedian.findUnique({
    where: { id: comedianId },
    include: { genres: true },
  });

  if (!comedian) {
    throw new Error("Comedian not found");
  }

  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 60);

  const [revenueSources, podcastConversion, topEpisodes, audienceRows, podcastIds, scheduledEvents] =
    await Promise.all([
      getRevenueBySource(comedianId),
      getPodcastConversionStats(comedianId),
      getTopConvertingEpisodes(comedianId, 5),
      prisma.audienceHeatmap.findMany({ where: { comedianId } }),
      prisma.podcastShow.findMany({ where: { comedianId }, select: { id: true } }),
      prisma.event.findMany({
        where: {
          comedians: { some: { comedianId } },
          date: { gte: now, lte: horizon },
        },
        include: { venue: true },
      }),
    ]);

  const podcastEpisodes =
    podcastIds.length > 0
      ? await prisma.podcastEpisode.findMany({
          where: { podcastId: { in: podcastIds.map((podcast) => podcast.id) } },
          select: { title: true, topCities: true },
        })
      : [];

  const candidates = await Promise.all(
    TARGET_CITIES.map(async (targetCity) => {
      const [scene, venues, upcomingEvents] = await Promise.all([
        computeSceneIntelligence(targetCity.city, targetCity.state).catch(() => null),
        prisma.venue.findMany({
          where: {
            city: { equals: targetCity.city, mode: "insensitive" },
            state: { equals: targetCity.state, mode: "insensitive" },
          },
          include: {
            _count: { select: { events: true } },
          },
          take: 12,
        }),
        prisma.event.findMany({
          where: {
            date: { gte: now, lte: horizon },
            venue: {
              city: { equals: targetCity.city, mode: "insensitive" },
              state: { equals: targetCity.state, mode: "insensitive" },
            },
          },
          include: {
            fairPricePolicy: true,
          },
          take: 60,
        }),
      ]);

      const audienceRow = audienceRows.find(
        (row) =>
          row.city.toLowerCase() === targetCity.city.toLowerCase() &&
          row.state.toLowerCase() === targetCity.state.toLowerCase(),
      );
      const audienceStrength = clamp(
        Math.round((audienceRow?.fanCount ?? 0) / 5 + (audienceRow?.engagementScore ?? 0) * 10),
        0,
        100,
      );
      const podcastCityMatches = podcastEpisodes.reduce(
        (count, episode) => count + readTopCities(episode.topCities, targetCity),
        0,
      );
      const podcastLift = clamp(
        Math.round(podcastCityMatches * 18 + podcastConversion.conversionRate * 100),
        0,
        100,
      );
      const venueDepth = clamp(
        Math.round(venues.length * 8 + upcomingEvents.length * 1.4),
        0,
        100,
      );
      const fairCoverage =
        upcomingEvents.length > 0
          ? Math.round(
              (upcomingEvents.filter((event) => !!event.fairPricePolicy).length / upcomingEvents.length) *
                100,
            )
          : 0;
      const conflictPenalty = scheduledEvents.some(
        (event) =>
          event.venue.state.toLowerCase() === targetCity.state.toLowerCase() &&
          Math.abs(new Date(event.date).getTime() - now.getTime()) <= 7 * 24 * 60 * 60 * 1000,
      )
        ? 12
        : 0;
      const averageTicketPrice =
        upcomingEvents.length > 0
          ? round(
              upcomingEvents.reduce((sum, event) => sum + Number(event.priceMin ?? 0), 0) /
                upcomingEvents.length,
            )
          : 0;
      const recommendedVenues = venues
        .map((venue) => ({
          id: venue.id,
          name: venue.name,
          type: venue.type,
          capacity: venue.capacity,
          upcomingShows: venue._count.events,
          fairShows: upcomingEvents.filter((event) => event.venueId === venue.id && !!event.fairPricePolicy).length,
        }))
        .sort((a, b) => b.upcomingShows - a.upcomingShows)
        .slice(0, 4);

      const score = scoreRouteCandidate({
        sceneScore: scene?.sceneScore ?? 54,
        audienceStrength,
        podcastLift,
        venueDepth,
        fairCoverage,
        conflictPenalty,
      });

      const routeReason =
        score >= 75
          ? `${targetCity.shortLabel} is the clearest next city because the scene is active and your audience signals are already there.`
          : score >= 60
            ? `${targetCity.shortLabel} looks promising if you want a market with enough activity to justify a booking push.`
            : `${targetCity.shortLabel} is still more watchlist than route-lock without stronger audience or podcast proof.`;

      return {
        city: targetCity,
        score,
        audienceStrength,
        podcastLift,
        sceneScore: scene?.sceneScore ?? 0,
        averageTicketPrice,
        routeReason,
        recommendedVenues,
      };
    }),
  );

  return {
    comedian: {
      id: comedian.id,
      name: comedian.name,
      genres: comedian.genres.map((genre) => genre.genre),
    },
    generatedAt: new Date().toISOString(),
    topRevenueSources: revenueSources.slice(0, 4),
    podcastConversion,
    topEpisodes: topEpisodes.map((episode) => ({
      id: episode.id,
      title: episode.title,
      totalPurchases: episode.totalPurchases,
      totalRevenue: episode.totalRevenue,
    })),
    candidates: candidates.sort((a, b) => b.score - a.score),
  };
}

