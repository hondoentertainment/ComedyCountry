import { getFreshnessDashboardData } from "@/lib/freshness";
import { resolveImportOptions } from "@/lib/import";
import { prisma } from "@/lib/prisma";
import { TARGET_CITIES } from "@/lib/target-cities";

export type EventDataGap = {
  id: string;
  title: string;
  venueName: string;
  city: string;
  state: string;
  date: Date;
  issues: string[];
  href: string;
};

export type VenueDataGap = {
  id: string;
  name: string;
  city: string;
  state: string;
  issues: string[];
  href: string;
};

export type RecentImportRun = {
  id: string;
  action: "import_run" | "import_preview";
  source: string;
  createdAt: Date;
  venuesRequested: number;
  eventsRequested: number;
  venueCreates: number;
  venueUpdates: number;
  venueErrors: number;
  eventCreates: number;
  eventUpdates: number;
  eventErrors: number;
  warnings: string[];
  targetCitiesTouched: string[];
};

export type ImportGuardrailSummary = {
  dryRunDefault: boolean;
  strictTargetCities: boolean;
  maxVenues: number;
  maxEvents: number;
  bulkImportApiKeyConfigured: boolean;
};

export type OpsReadinessSnapshot = {
  generatedAt: Date;
  totals: {
    targetCityVenues: number;
    targetCityUpcomingEvents: number;
    staleQueueSize: number;
    averageCoverage: number;
  };
  importGuardrails: ImportGuardrailSummary;
  freshness: Awaited<ReturnType<typeof getFreshnessDashboardData>>;
  eventGaps: EventDataGap[];
  venueGaps: VenueDataGap[];
  recentImports: RecentImportRun[];
};

function isTargetCityClause() {
  return TARGET_CITIES.map((targetCity) => ({
    city: { equals: targetCity.city, mode: "insensitive" as const },
    state: { equals: targetCity.state, mode: "insensitive" as const },
  }));
}

function parseImportMetadata(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parsed;
  } catch {
    return null;
  }
}

export function getImportGuardrailSummary(): ImportGuardrailSummary {
  const resolved = resolveImportOptions({ logRun: false });

  return {
    dryRunDefault: resolved.dryRun,
    strictTargetCities: resolved.strictTargetCities,
    maxVenues: resolved.maxVenues,
    maxEvents: resolved.maxEvents,
    bulkImportApiKeyConfigured: Boolean(process.env.BULK_IMPORT_API_KEY),
  };
}

export async function getEventDataGaps(limit = 10, days = 14): Promise<EventDataGap[]> {
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + days);

  const events = await prisma.event.findMany({
    where: {
      date: { gte: now, lte: horizon },
      venue: {
        OR: isTargetCityClause(),
      },
    },
    include: {
      venue: true,
      comedians: true,
      accessibilityTags: true,
      fairPricePolicy: true,
    },
    orderBy: { date: "asc" },
    take: Math.max(limit * 4, 20),
  });

  return events
    .map((event) => {
      const issues: string[] = [];
      if (!event.showtime) issues.push("Missing showtime");
      if (!event.ticketUrl) issues.push("Missing ticket URL");
      if (event.comedians.length === 0) issues.push("Missing lineup");
      if (event.accessibilityTags.length === 0) issues.push("No accessibility metadata");
      if (!event.fairPricePolicy) issues.push("No fair-ticket policy");

      const title =
        event.title ||
        (event.comedians.length > 0 ? `${event.comedians.length}-comic lineup` : "Untitled event");

      return {
        id: event.id,
        title,
        venueName: event.venue.name,
        city: event.venue.city,
        state: event.venue.state,
        date: event.date,
        issues,
        href: `/admin/events/${event.id}`,
      };
    })
    .filter((event) => event.issues.length > 0)
    .slice(0, limit);
}

export async function getVenueDataGaps(limit = 10): Promise<VenueDataGap[]> {
  const venues = await prisma.venue.findMany({
    where: {
      OR: isTargetCityClause(),
    },
    include: {
      socialLinks: true,
      accessibilityTags: true,
    },
    take: Math.max(limit * 4, 20),
  });

  return venues
    .map((venue) => {
      const issues: string[] = [];
      if (!venue.website) issues.push("Missing website");
      if (!venue.address) issues.push("Missing street address");
      if (venue.latitude == null || venue.longitude == null) issues.push("Missing map coordinates");
      if (venue.socialLinks.length === 0) issues.push("No social links");
      if (venue.accessibilityTags.length === 0) issues.push("No accessibility metadata");

      return {
        id: venue.id,
        name: venue.name,
        city: venue.city,
        state: venue.state,
        issues,
        href: `/admin/venues/${venue.id}`,
      };
    })
    .filter((venue) => venue.issues.length > 0)
    .slice(0, limit);
}

export async function getRecentImportRuns(limit = 6): Promise<RecentImportRun[]> {
  const rows = await prisma.analyticsEvent.findMany({
    where: {
      entityType: "ops:import",
      action: { in: ["import_run", "import_preview"] },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((row) => {
    const metadata = parseImportMetadata(row.metadata);
    return {
      id: row.id,
      action: row.action as "import_run" | "import_preview",
      source: typeof metadata?.source === "string" ? metadata.source : row.entityId ?? "bulk-import",
      createdAt: row.createdAt,
      venuesRequested: typeof metadata?.venuesRequested === "number" ? metadata.venuesRequested : 0,
      eventsRequested: typeof metadata?.eventsRequested === "number" ? metadata.eventsRequested : 0,
      venueCreates: typeof metadata?.venueCreates === "number" ? metadata.venueCreates : 0,
      venueUpdates: typeof metadata?.venueUpdates === "number" ? metadata.venueUpdates : 0,
      venueErrors: typeof metadata?.venueErrors === "number" ? metadata.venueErrors : 0,
      eventCreates: typeof metadata?.eventCreates === "number" ? metadata.eventCreates : 0,
      eventUpdates: typeof metadata?.eventUpdates === "number" ? metadata.eventUpdates : 0,
      eventErrors: typeof metadata?.eventErrors === "number" ? metadata.eventErrors : 0,
      warnings: Array.isArray(metadata?.warnings)
        ? metadata.warnings.filter((value): value is string => typeof value === "string")
        : [],
      targetCitiesTouched: Array.isArray(metadata?.targetCitiesTouched)
        ? metadata.targetCitiesTouched.filter((value): value is string => typeof value === "string")
        : [],
    };
  });
}

export async function getOpsReadinessSnapshot(): Promise<OpsReadinessSnapshot> {
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 30);

  const [freshness, eventGaps, venueGaps, recentImports, venueCount, upcomingEventCount] = await Promise.all([
    getFreshnessDashboardData(),
    getEventDataGaps(),
    getVenueDataGaps(),
    getRecentImportRuns(),
    prisma.venue.count({
      where: {
        OR: isTargetCityClause(),
      },
    }),
    prisma.event.count({
      where: {
        date: { gte: now, lte: horizon },
        venue: {
          OR: isTargetCityClause(),
        },
      },
    }),
  ]);

  return {
    generatedAt: now,
    totals: {
      targetCityVenues: venueCount,
      targetCityUpcomingEvents: upcomingEventCount,
      staleQueueSize: freshness.summary.staleCount,
      averageCoverage: freshness.summary.averageCoverage,
    },
    importGuardrails: getImportGuardrailSummary(),
    freshness,
    eventGaps,
    venueGaps,
    recentImports,
  };
}
