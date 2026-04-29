import { prisma } from "@/lib/prisma";
import { TARGET_CITIES, type TargetCity } from "@/lib/target-cities";

export type FreshnessStatus = "fresh" | "aging" | "stale";

export interface FreshnessSnapshot {
  score: number;
  status: FreshnessStatus;
  sourceConfidence: number;
  lastVerifiedAt: Date | null;
  updatedWithinDays: number | null;
  reasons: string[];
}

export interface TargetCityCoverage {
  city: TargetCity;
  coverageScore: number;
  freshnessAverage: number;
  confidenceAverage: number;
  venueCount: number;
  upcomingEventCount: number;
  accessibleEventCount: number;
  fairEventCount: number;
  verifiedAccessibilityCount: number;
}

export interface StaleQueueItem {
  id: string;
  entityType: "event" | "venue";
  label: string;
  city: string;
  state: string;
  freshness: FreshnessSnapshot;
  href: string;
  detail: string;
}

type EventFreshnessInput = {
  updatedAt: Date;
  date: Date;
  showtime?: string | null;
  ticketUrl?: string | null;
  priceMin?: { toString(): string } | number | null;
  priceMax?: { toString(): string } | number | null;
  comedians: Array<unknown>;
  accessibilityTags?: Array<{ verifiedBy?: string | null; verifiedAt?: Date | null }>;
  fairPricePolicy?: { updatedAt?: Date | null } | null;
  venue?: { updatedAt?: Date | null; website?: string | null } | null;
};

type VenueFreshnessInput = {
  updatedAt: Date;
  website?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capacity?: number | null;
  accessibilityTags?: Array<{ verifiedBy?: string | null; verifiedAt?: Date | null }>;
  socialLinks?: Array<unknown>;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function daysSince(date: Date | null | undefined) {
  if (!date) return null;
  const diff = Date.now() - new Date(date).getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

function latestDate(dates: Array<Date | null | undefined>) {
  const valid = dates.filter((value): value is Date => value instanceof Date);
  if (valid.length === 0) return null;
  return valid.sort((a, b) => b.getTime() - a.getTime())[0];
}

function toNumber(value: { toString(): string } | number | null | undefined) {
  if (typeof value === "number") return value;
  if (value && typeof value.toString === "function") {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function getFreshnessStatus(score: number): FreshnessStatus {
  if (score >= 75) return "fresh";
  if (score >= 50) return "aging";
  return "stale";
}

export function getEventFreshnessSnapshot(event: EventFreshnessInput): FreshnessSnapshot {
  const verifiedTagCount =
    event.accessibilityTags?.filter((tag) => !!tag.verifiedBy).length ?? 0;
  const lastVerifiedAt = latestDate([
    event.updatedAt,
    event.fairPricePolicy?.updatedAt ?? null,
    event.venue?.updatedAt ?? null,
    ...(event.accessibilityTags?.map((tag) => tag.verifiedAt ?? null) ?? []),
  ]);
  const updatedWithinDays = daysSince(lastVerifiedAt);
  const daysUntilEvent = clamp(
    Math.round((new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    -30,
    365,
  );
  const completenessSignals = [
    event.comedians.length > 0,
    !!event.showtime,
    !!event.ticketUrl,
    toNumber(event.priceMin) !== null || toNumber(event.priceMax) !== null,
    !!event.venue?.website,
  ];
  const completeness =
    (completenessSignals.filter(Boolean).length / completenessSignals.length) * 100;

  const recencyScore =
    updatedWithinDays === null
      ? 20
      : updatedWithinDays <= 2
        ? 100
        : updatedWithinDays <= 7
          ? 82
          : updatedWithinDays <= 14
            ? 64
            : updatedWithinDays <= 30
              ? 42
              : 20;
  const verificationScore = clamp(verifiedTagCount * 20 + (event.fairPricePolicy ? 18 : 0), 0, 100);
  const urgencyScore =
    daysUntilEvent <= 2
      ? 100
      : daysUntilEvent <= 7
        ? 78
        : daysUntilEvent <= 21
          ? 62
          : 48;

  const score = round(
    recencyScore * 0.45 +
      completeness * 0.25 +
      verificationScore * 0.15 +
      urgencyScore * 0.15,
  );

  const sourceConfidence = round(
    completeness * 0.4 +
      verificationScore * 0.35 +
      recencyScore * 0.25,
  );

  const reasons: string[] = [];
  if (updatedWithinDays !== null && updatedWithinDays <= 7) {
    reasons.push("Updated within the last week");
  }
  if (verifiedTagCount > 0) {
    reasons.push(`${verifiedTagCount} verified accessibility signal${verifiedTagCount > 1 ? "s" : ""}`);
  }
  if (event.fairPricePolicy) {
    reasons.push("Fair-ticketing policy is configured");
  }
  if (!event.ticketUrl) {
    reasons.push("Missing live ticket link");
  }
  if (!event.showtime) {
    reasons.push("Showtime still missing");
  }
  if (event.comedians.length === 0) {
    reasons.push("Lineup needs confirmation");
  }

  return {
    score,
    status: getFreshnessStatus(score),
    sourceConfidence,
    lastVerifiedAt,
    updatedWithinDays,
    reasons,
  };
}

export function getVenueFreshnessSnapshot(venue: VenueFreshnessInput): FreshnessSnapshot {
  const verifiedTagCount =
    venue.accessibilityTags?.filter((tag) => !!tag.verifiedBy).length ?? 0;
  const lastVerifiedAt = latestDate([
    venue.updatedAt,
    ...(venue.accessibilityTags?.map((tag) => tag.verifiedAt ?? null) ?? []),
  ]);
  const updatedWithinDays = daysSince(lastVerifiedAt);
  const completenessSignals = [
    !!venue.website,
    !!venue.address,
    venue.capacity != null,
    venue.latitude != null && venue.longitude != null,
    (venue.socialLinks?.length ?? 0) > 0,
  ];
  const completeness =
    (completenessSignals.filter(Boolean).length / completenessSignals.length) * 100;
  const recencyScore =
    updatedWithinDays === null
      ? 24
      : updatedWithinDays <= 7
        ? 100
        : updatedWithinDays <= 21
          ? 72
          : updatedWithinDays <= 45
            ? 48
            : 24;
  const verificationScore = clamp(verifiedTagCount * 20, 0, 100);
  const score = round(recencyScore * 0.5 + completeness * 0.35 + verificationScore * 0.15);
  const sourceConfidence = round(completeness * 0.45 + verificationScore * 0.35 + recencyScore * 0.2);

  const reasons: string[] = [];
  if (updatedWithinDays !== null && updatedWithinDays <= 21) {
    reasons.push("Venue profile was updated recently");
  }
  if (verifiedTagCount > 0) {
    reasons.push("Verified accessibility metadata is present");
  }
  if (!venue.website) reasons.push("Website is missing");
  if (!venue.address) reasons.push("Street address is missing");
  if (venue.latitude == null || venue.longitude == null) reasons.push("Map coordinates are missing");

  return {
    score,
    status: getFreshnessStatus(score),
    sourceConfidence,
    lastVerifiedAt,
    updatedWithinDays,
    reasons,
  };
}

export async function getTargetCityCoverage(): Promise<TargetCityCoverage[]> {
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 45);

  return Promise.all(
    TARGET_CITIES.map(async (targetCity) => {
      const [venues, events] = await Promise.all([
        prisma.venue.findMany({
          where: {
            city: { equals: targetCity.city, mode: "insensitive" },
            state: { equals: targetCity.state, mode: "insensitive" },
          },
          include: {
            accessibilityTags: true,
            socialLinks: true,
          },
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
            venue: true,
            comedians: true,
            accessibilityTags: true,
            fairPricePolicy: true,
          },
          orderBy: { date: "asc" },
        }),
      ]);

      const eventFreshness = events.map((event) => getEventFreshnessSnapshot(event));
      const venueFreshness = venues.map((venue) => getVenueFreshnessSnapshot(venue));
      const accessibleEventCount = events.filter((event) => event.accessibilityTags.length > 0).length;
      const fairEventCount = events.filter((event) => !!event.fairPricePolicy).length;
      const verifiedAccessibilityCount = events.filter((event) =>
        event.accessibilityTags.some((tag) => !!tag.verifiedBy),
      ).length;
      const freshnessAverage =
        eventFreshness.length > 0
          ? round(eventFreshness.reduce((sum, item) => sum + item.score, 0) / eventFreshness.length)
          : venueFreshness.length > 0
            ? round(venueFreshness.reduce((sum, item) => sum + item.score, 0) / venueFreshness.length)
            : 0;
      const confidenceAverage =
        eventFreshness.length > 0
          ? round(eventFreshness.reduce((sum, item) => sum + item.sourceConfidence, 0) / eventFreshness.length)
          : venueFreshness.length > 0
            ? round(venueFreshness.reduce((sum, item) => sum + item.sourceConfidence, 0) / venueFreshness.length)
            : 0;
      const venueCoverage = clamp((venues.length / 20) * 100, 0, 100);
      const eventCoverage = clamp((events.length / 60) * 100, 0, 100);
      const trustCoverage =
        events.length > 0
          ? round(
              ((accessibleEventCount / events.length) * 45) +
                ((fairEventCount / events.length) * 35) +
                ((verifiedAccessibilityCount / events.length) * 20),
            )
          : 0;
      const coverageScore = round(
        venueCoverage * 0.2 +
          eventCoverage * 0.25 +
          freshnessAverage * 0.35 +
          trustCoverage * 0.2,
      );

      return {
        city: targetCity,
        coverageScore,
        freshnessAverage,
        confidenceAverage,
        venueCount: venues.length,
        upcomingEventCount: events.length,
        accessibleEventCount,
        fairEventCount,
        verifiedAccessibilityCount,
      };
    }),
  );
}

export async function getStaleQueue(limit = 8) {
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 30);

  const [events, venues] = await Promise.all([
    prisma.event.findMany({
      where: {
        date: { gte: now, lte: horizon },
        OR: TARGET_CITIES.map((targetCity) => ({
          venue: {
            city: { equals: targetCity.city, mode: "insensitive" },
            state: { equals: targetCity.state, mode: "insensitive" },
          },
        })),
      },
      include: {
        venue: true,
        comedians: true,
        accessibilityTags: true,
        fairPricePolicy: true,
      },
      orderBy: { date: "asc" },
      take: 80,
    }),
    prisma.venue.findMany({
      where: {
        OR: TARGET_CITIES.map((targetCity) => ({
          city: { equals: targetCity.city, mode: "insensitive" },
          state: { equals: targetCity.state, mode: "insensitive" },
        })),
      },
      include: {
        accessibilityTags: true,
        socialLinks: true,
      },
      take: 60,
    }),
  ]);

  const staleEvents: StaleQueueItem[] = events
    .map((event) => {
      const freshness = getEventFreshnessSnapshot(event);
      const title =
        event.title ||
        (event.comedians.length > 0 ? `${event.comedians.length}-comic lineup` : "Untitled event");
      return {
        id: event.id,
        entityType: "event" as const,
        label: title,
        city: event.venue.city,
        state: event.venue.state,
        freshness,
        href: `/admin/events/${event.id}`,
        detail: `${event.venue.name} · ${new Date(event.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}`,
      };
    })
    .filter((item) => item.freshness.status !== "fresh")
    .sort((a, b) => a.freshness.score - b.freshness.score)
    .slice(0, limit);

  const staleVenues: StaleQueueItem[] = venues
    .map((venue) => ({
      id: venue.id,
      entityType: "venue" as const,
      label: venue.name,
      city: venue.city,
      state: venue.state,
      freshness: getVenueFreshnessSnapshot(venue),
      href: `/admin/venues/${venue.id}`,
      detail: `${venue.city}, ${venue.state}`,
    }))
    .filter((item) => item.freshness.status !== "fresh")
    .sort((a, b) => a.freshness.score - b.freshness.score)
    .slice(0, limit);

  return { staleEvents, staleVenues };
}

export async function getFreshnessDashboardData() {
  const [cities, queues] = await Promise.all([getTargetCityCoverage(), getStaleQueue()]);
  const staleCount = queues.staleEvents.length + queues.staleVenues.length;
  const averageCoverage =
    cities.length > 0
      ? round(cities.reduce((sum, city) => sum + city.coverageScore, 0) / cities.length)
      : 0;

  return {
    cities,
    ...queues,
    summary: {
      staleCount,
      averageCoverage,
      freshestCity:
        cities.slice().sort((a, b) => b.coverageScore - a.coverageScore)[0] ?? null,
    },
  };
}

