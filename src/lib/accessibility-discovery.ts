import { prisma } from "./prisma";
import { ACCESSIBILITY_TYPES, type AccessibilityType } from "./accessibility";

/**
 * Phase 17: Accessibility-first show discovery.
 * Functions for finding ASL-interpreted, captioned, sensory-friendly events,
 * filtering, and accessibility scoring.
 */

/* ─── Types ───────────────────────────────────────────────────────────── */

export interface AccessibilityFilter {
  aslInterpreted?: boolean;
  captioned?: boolean;
  sensoryFriendly?: boolean;
  audioDescribed?: boolean;
  wheelchairAccessible?: boolean;
  hearingLoop?: boolean;
  largePrint?: boolean;
  serviceAnimal?: boolean;
  city?: string;
  state?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minScore?: number;
  take?: number;
  skip?: number;
}

export interface AccessibleEvent {
  id: string;
  title: string | null;
  date: Date;
  showtime: string | null;
  venue: {
    id: string;
    name: string;
    city: string;
    state: string;
  };
  accessibilityTags: Array<{
    id: string;
    type: string;
    description: string | null;
    verifiedBy: string | null;
    verifiedAt: Date | null;
  }>;
  accessibilityScore: number;
  comedians?: Array<{
    comedian: { name: string; slug: string };
  }>;
}

export interface AccessibilityScoreBreakdown {
  total: number;
  featureCount: number;
  verifiedCount: number;
  featureScore: number;
  verificationBonus: number;
  features: string[];
}

/* ─── Feature flag to type mapping ────────────────────────────────────── */

const FILTER_TYPE_MAP: Record<string, AccessibilityType> = {
  aslInterpreted: "asl_interpreted",
  captioned: "captioned",
  sensoryFriendly: "sensory_friendly",
  audioDescribed: "audio_described",
  wheelchairAccessible: "wheelchair",
  hearingLoop: "hearing_loop",
  largePrint: "large_print",
  serviceAnimal: "service_animal",
};

/* ─── Extract requested accessibility types from filter ───────────────── */

export function extractAccessibilityTypes(filter: AccessibilityFilter): string[] {
  const types: string[] = [];

  for (const [key, accessType] of Object.entries(FILTER_TYPE_MAP)) {
    if (filter[key as keyof AccessibilityFilter] === true) {
      types.push(accessType);
    }
  }

  return types;
}

/* ─── Calculate accessibility score for an event/venue ────────────────── */

export function calculateAccessibilityScore(
  tags: Array<{ type: string; verifiedBy?: string | null }>,
): AccessibilityScoreBreakdown {
  if (tags.length === 0) {
    return {
      total: 0,
      featureCount: 0,
      verifiedCount: 0,
      featureScore: 0,
      verificationBonus: 0,
      features: [],
    };
  }

  // Each unique feature type is worth points
  const uniqueTypes = [...new Set(tags.map((t) => t.type))];
  const featureCount = uniqueTypes.length;
  const totalPossible = ACCESSIBILITY_TYPES.length;

  // Base score: percentage of possible features (0-70 points)
  const featureScore = Math.round((featureCount / totalPossible) * 70);

  // Verification bonus: verified tags worth extra (0-30 points)
  const verifiedCount = tags.filter((t) => t.verifiedBy).length;
  const verificationBonus =
    tags.length > 0
      ? Math.round((verifiedCount / tags.length) * 30)
      : 0;

  const total = featureScore + verificationBonus;

  return {
    total,
    featureCount,
    verifiedCount,
    featureScore,
    verificationBonus,
    features: uniqueTypes,
  };
}

/* ─── Find ASL-interpreted shows ──────────────────────────────────────── */

export async function findASLShows(options?: {
  city?: string;
  state?: string;
  dateFrom?: Date;
  dateTo?: Date;
  take?: number;
  skip?: number;
}) {
  const { city, state, dateFrom, dateTo, take = 20, skip = 0 } = options || {};

  const where: Record<string, unknown> = {
    accessibilityTags: {
      some: { type: "asl_interpreted" },
    },
    date: { gte: dateFrom || new Date() },
  };

  if (dateTo) {
    where.date = { ...(where.date as Record<string, unknown>), lte: dateTo };
  }

  if (city || state) {
    const venueWhere: Record<string, string> = {};
    if (city) venueWhere.city = city;
    if (state) venueWhere.state = state;
    where.venue = venueWhere;
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: {
        venue: true,
        accessibilityTags: true,
        comedians: { include: { comedian: true } },
      },
      orderBy: { date: "asc" },
      take,
      skip,
    }),
    prisma.event.count({ where }),
  ]);

  return {
    events: events.map((e) => ({
      ...e,
      accessibilityScore: calculateAccessibilityScore(e.accessibilityTags).total,
    })),
    total,
  };
}

/* ─── Find captioned shows ────────────────────────────────────────────── */

export async function findCaptionedShows(options?: {
  city?: string;
  state?: string;
  dateFrom?: Date;
  dateTo?: Date;
  take?: number;
  skip?: number;
}) {
  const { city, state, dateFrom, dateTo, take = 20, skip = 0 } = options || {};

  const where: Record<string, unknown> = {
    accessibilityTags: {
      some: { type: "captioned" },
    },
    date: { gte: dateFrom || new Date() },
  };

  if (dateTo) {
    where.date = { ...(where.date as Record<string, unknown>), lte: dateTo };
  }

  if (city || state) {
    const venueWhere: Record<string, string> = {};
    if (city) venueWhere.city = city;
    if (state) venueWhere.state = state;
    where.venue = venueWhere;
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: {
        venue: true,
        accessibilityTags: true,
        comedians: { include: { comedian: true } },
      },
      orderBy: { date: "asc" },
      take,
      skip,
    }),
    prisma.event.count({ where }),
  ]);

  return {
    events: events.map((e) => ({
      ...e,
      accessibilityScore: calculateAccessibilityScore(e.accessibilityTags).total,
    })),
    total,
  };
}

/* ─── Find sensory-friendly events ────────────────────────────────────── */

export async function findSensoryFriendlyEvents(options?: {
  city?: string;
  state?: string;
  dateFrom?: Date;
  dateTo?: Date;
  take?: number;
  skip?: number;
}) {
  const { city, state, dateFrom, dateTo, take = 20, skip = 0 } = options || {};

  const where: Record<string, unknown> = {
    accessibilityTags: {
      some: { type: "sensory_friendly" },
    },
    date: { gte: dateFrom || new Date() },
  };

  if (dateTo) {
    where.date = { ...(where.date as Record<string, unknown>), lte: dateTo };
  }

  if (city || state) {
    const venueWhere: Record<string, string> = {};
    if (city) venueWhere.city = city;
    if (state) venueWhere.state = state;
    where.venue = venueWhere;
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: {
        venue: true,
        accessibilityTags: true,
        comedians: { include: { comedian: true } },
      },
      orderBy: { date: "asc" },
      take,
      skip,
    }),
    prisma.event.count({ where }),
  ]);

  return {
    events: events.map((e) => ({
      ...e,
      accessibilityScore: calculateAccessibilityScore(e.accessibilityTags).total,
    })),
    total,
  };
}

/* ─── Advanced multi-filter accessible show discovery ─────────────────── */

export async function discoverAccessibleShows(filter: AccessibilityFilter) {
  const {
    city,
    state,
    dateFrom,
    dateTo,
    minScore,
    take = 20,
    skip = 0,
  } = filter;

  const requestedTypes = extractAccessibilityTypes(filter);

  const where: Record<string, unknown> = {
    date: { gte: dateFrom || new Date() },
  };

  if (dateTo) {
    where.date = { ...(where.date as Record<string, unknown>), lte: dateTo };
  }

  // If specific types requested, require events that have ALL of them
  if (requestedTypes.length > 0) {
    where.AND = requestedTypes.map((type) => ({
      accessibilityTags: { some: { type } },
    }));
  } else {
    // Default: any accessibility tag
    where.accessibilityTags = { some: {} };
  }

  if (city || state) {
    const venueWhere: Record<string, string> = {};
    if (city) venueWhere.city = city;
    if (state) venueWhere.state = state;
    where.venue = venueWhere;
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: {
        venue: true,
        accessibilityTags: true,
        comedians: { include: { comedian: true } },
      },
      orderBy: { date: "asc" },
      take: minScore ? take * 3 : take, // Fetch more if we need to filter by score
      skip: minScore ? 0 : skip,
    }),
    prisma.event.count({ where }),
  ]);

  let scoredEvents = events.map((e) => ({
    ...e,
    accessibilityScore: calculateAccessibilityScore(e.accessibilityTags).total,
  }));

  // Filter by minimum score if specified
  if (minScore) {
    scoredEvents = scoredEvents.filter((e) => e.accessibilityScore >= minScore);
  }

  // Sort by accessibility score descending, then date ascending
  scoredEvents.sort((a, b) => {
    if (b.accessibilityScore !== a.accessibilityScore) {
      return b.accessibilityScore - a.accessibilityScore;
    }
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  // Apply pagination after score filtering
  if (minScore) {
    const paginated = scoredEvents.slice(skip, skip + take);
    return { events: paginated, total: scoredEvents.length };
  }

  return { events: scoredEvents, total };
}

/* ─── Get accessibility summary for a venue ───────────────────────────── */

export async function getVenueAccessibilitySummary(venueId: string) {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    include: {
      accessibilityTags: true,
    },
  });

  if (!venue) {
    throw new Error("Venue not found");
  }

  const score = calculateAccessibilityScore(venue.accessibilityTags);

  // Get upcoming accessible events at this venue
  const upcomingEvents = await prisma.event.findMany({
    where: {
      venueId,
      date: { gte: new Date() },
      accessibilityTags: { some: {} },
    },
    include: {
      accessibilityTags: true,
    },
    orderBy: { date: "asc" },
    take: 5,
  });

  return {
    venue: {
      id: venue.id,
      name: venue.name,
      city: venue.city,
      state: venue.state,
    },
    score,
    tags: venue.accessibilityTags,
    upcomingAccessibleEvents: upcomingEvents.length,
  };
}

/* ─── Rank venues by accessibility ────────────────────────────────────── */

export async function rankVenuesByAccessibility(options?: {
  city?: string;
  state?: string;
  take?: number;
  skip?: number;
}) {
  const { city, state, take = 20, skip = 0 } = options || {};

  const where: Record<string, unknown> = {
    accessibilityTags: { some: {} },
  };

  if (city) where.city = city;
  if (state) where.state = state;

  const venues = await prisma.venue.findMany({
    where,
    include: {
      accessibilityTags: true,
    },
  });

  const scoredVenues = venues.map((v) => ({
    ...v,
    accessibilityScore: calculateAccessibilityScore(v.accessibilityTags),
  }));

  // Sort by total score descending
  scoredVenues.sort((a, b) => b.accessibilityScore.total - a.accessibilityScore.total);

  return {
    venues: scoredVenues.slice(skip, skip + take),
    total: scoredVenues.length,
  };
}

/* ─── Get accessibility feature coverage stats ────────────────────────── */

export async function getAccessibilityFeatureCoverage() {
  const allTags = await prisma.accessibilityTag.findMany({
    select: { type: true, eventId: true, venueId: true, verifiedBy: true },
  });

  const totalEvents = await prisma.event.count();
  const totalVenues = await prisma.venue.count();

  const coverage: Record<string, {
    eventCount: number;
    venueCount: number;
    verifiedCount: number;
    eventPercentage: number;
    venuePercentage: number;
  }> = {};

  for (const accType of ACCESSIBILITY_TYPES) {
    const tagsOfType = allTags.filter((t) => t.type === accType);
    const eventIds = new Set(tagsOfType.filter((t) => t.eventId).map((t) => t.eventId));
    const venueIds = new Set(tagsOfType.filter((t) => t.venueId).map((t) => t.venueId));
    const verifiedCount = tagsOfType.filter((t) => t.verifiedBy).length;

    coverage[accType] = {
      eventCount: eventIds.size,
      venueCount: venueIds.size,
      verifiedCount,
      eventPercentage: totalEvents > 0 ? Math.round((eventIds.size / totalEvents) * 100) : 0,
      venuePercentage: totalVenues > 0 ? Math.round((venueIds.size / totalVenues) * 100) : 0,
    };
  }

  return {
    totalEvents,
    totalVenues,
    coverage,
  };
}
