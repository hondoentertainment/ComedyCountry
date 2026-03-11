import { prisma } from "./prisma";

/**
 * Phase 17: Accessibility Tags & Accessible Event/Venue Search
 */

export const ACCESSIBILITY_TYPES = [
  "asl_interpreted",
  "captioned",
  "audio_described",
  "sensory_friendly",
  "wheelchair",
  "hearing_loop",
  "large_print",
  "service_animal",
] as const;

export type AccessibilityType = (typeof ACCESSIBILITY_TYPES)[number];

/* ─── Add an accessibility tag to an event or venue ─────────────────── */

export async function addAccessibilityTag(data: {
  eventId?: string;
  venueId?: string;
  type: string;
  description?: string;
}) {
  if (!data.eventId && !data.venueId) {
    throw new Error("Either eventId or venueId is required");
  }

  if (!ACCESSIBILITY_TYPES.includes(data.type as AccessibilityType)) {
    throw new Error(`Invalid accessibility type: ${data.type}`);
  }

  return prisma.accessibilityTag.create({
    data: {
      eventId: data.eventId ?? null,
      venueId: data.venueId ?? null,
      type: data.type,
      description: data.description ?? null,
    },
  });
}

/* ─── Get accessibility tags for an event or venue ──────────────────── */

export async function getAccessibilityTags(
  eventId?: string,
  venueId?: string,
) {
  const where: Record<string, unknown> = {};
  if (eventId) where.eventId = eventId;
  if (venueId) where.venueId = venueId;

  return prisma.accessibilityTag.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

/* ─── Remove an accessibility tag ───────────────────────────────────── */

export async function removeAccessibilityTag(id: string) {
  const tag = await prisma.accessibilityTag.findUnique({ where: { id } });
  if (!tag) {
    throw new Error("Accessibility tag not found");
  }

  return prisma.accessibilityTag.delete({ where: { id } });
}

/* ─── Verify an accessibility tag ───────────────────────────────────── */

export async function verifyAccessibilityTag(id: string, userId: string) {
  const tag = await prisma.accessibilityTag.findUnique({ where: { id } });
  if (!tag) {
    throw new Error("Accessibility tag not found");
  }

  return prisma.accessibilityTag.update({
    where: { id },
    data: {
      verifiedBy: userId,
      verifiedAt: new Date(),
    },
  });
}

/* ─── Search events by accessibility features ───────────────────────── */

export async function searchAccessibleEvents(filters: {
  types?: string[];
  city?: string;
  state?: string;
  dateFrom?: Date;
  dateTo?: Date;
  take?: number;
  skip?: number;
}) {
  const { types, city, state, dateFrom, dateTo, take = 20, skip = 0 } = filters;

  const where: Record<string, unknown> = {};

  // Filter by accessibility tag types
  if (types && types.length > 0) {
    where.accessibilityTags = {
      some: { type: { in: types } },
    };
  } else {
    // At least one accessibility tag
    where.accessibilityTags = { some: {} };
  }

  // Filter by location via venue
  const venueWhere: Record<string, unknown> = {};
  if (city) venueWhere.city = city;
  if (state) venueWhere.state = state;
  if (Object.keys(venueWhere).length > 0) {
    where.venue = venueWhere;
  }

  // Filter by date range
  if (dateFrom || dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter.gte = dateFrom;
    if (dateTo) dateFilter.lte = dateTo;
    where.date = dateFilter;
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: {
        venue: true,
        accessibilityTags: true,
        comedians: {
          include: { comedian: true },
        },
      },
      orderBy: { date: "asc" },
      take,
      skip,
    }),
    prisma.event.count({ where }),
  ]);

  return { events, total };
}

/* ─── Search venues by accessibility features ───────────────────────── */

export async function searchAccessibleVenues(filters: {
  types?: string[];
  city?: string;
  state?: string;
  take?: number;
  skip?: number;
}) {
  const { types, city, state, take = 20, skip = 0 } = filters;

  const where: Record<string, unknown> = {};

  if (types && types.length > 0) {
    where.accessibilityTags = {
      some: { type: { in: types } },
    };
  } else {
    where.accessibilityTags = { some: {} };
  }

  if (city) where.city = city;
  if (state) where.state = state;

  const [venues, total] = await Promise.all([
    prisma.venue.findMany({
      where,
      include: {
        accessibilityTags: true,
      },
      orderBy: { name: "asc" },
      take,
      skip,
    }),
    prisma.venue.count({ where }),
  ]);

  return { venues, total };
}

/* ─── Platform-wide accessibility stats ─────────────────────────────── */

export async function getAccessibilityStats() {
  const allTags = await prisma.accessibilityTag.findMany({
    select: { type: true, eventId: true, venueId: true, verifiedBy: true },
  });

  const totalEvents = await prisma.event.count();
  const totalVenues = await prisma.venue.count();

  // Count unique events / venues with any accessibility tag
  const eventsWithTags = new Set(
    allTags.filter((t) => t.eventId).map((t) => t.eventId),
  );
  const venuesWithTags = new Set(
    allTags.filter((t) => t.venueId).map((t) => t.venueId),
  );

  // Breakdown by type
  const typeCounts: Record<string, { events: number; venues: number }> = {};
  for (const tagType of ACCESSIBILITY_TYPES) {
    const tagsOfType = allTags.filter((t) => t.type === tagType);
    typeCounts[tagType] = {
      events: new Set(tagsOfType.filter((t) => t.eventId).map((t) => t.eventId)).size,
      venues: new Set(tagsOfType.filter((t) => t.venueId).map((t) => t.venueId)).size,
    };
  }

  const verifiedCount = allTags.filter((t) => t.verifiedBy).length;

  return {
    totalTags: allTags.length,
    eventsWithAccessibility: eventsWithTags.size,
    venuesWithAccessibility: venuesWithTags.size,
    eventPercentage: totalEvents > 0
      ? Math.round((eventsWithTags.size / totalEvents) * 100)
      : 0,
    venuePercentage: totalVenues > 0
      ? Math.round((venuesWithTags.size / totalVenues) * 100)
      : 0,
    verifiedTags: verifiedCount,
    byType: typeCounts,
  };
}
