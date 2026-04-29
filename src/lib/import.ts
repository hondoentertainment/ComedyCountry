import type { ShowType, VenueType } from "@prisma/client";
import { z } from "zod";
import { getTargetCityCoverage } from "./freshness";
import { prisma } from "./prisma";
import { matchTargetCity } from "./target-cities";

export type VenueImportItem = {
  name: string;
  address?: string;
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;
  capacity?: number;
  website?: string;
  type?: VenueType;
  photos?: { url: string; caption?: string }[];
  socialLinks?: { platform: string; url: string }[];
};

export type EventComedianRef = {
  slug: string;
  role?: string;
};

export type EventImportItem = {
  venue: { name: string; city: string; state: string };
  date: string;
  showtime?: string;
  ticketUrl?: string;
  priceMin?: number;
  priceMax?: number;
  showType?: ShowType;
  title?: string;
  comedians: EventComedianRef[];
};

export type ImportPayload = {
  venues?: VenueImportItem[];
  events?: EventImportItem[];
};

export type ImportOptions = {
  dryRun?: boolean;
  strictTargetCities?: boolean;
  maxVenues?: number;
  maxEvents?: number;
  actorId?: string | null;
  source?: string;
  logRun?: boolean;
};

export type ImportWarning = {
  code: string;
  scope: "payload" | "venue" | "event";
  message: string;
};

export type TargetCityImpact = {
  slug: string;
  label: string;
  shortLabel: string;
  venueImports: number;
  eventImports: number;
  currentCoverageScore: number | null;
  postImportCoverageScore: number | null;
  coverageDelta: number | null;
};

export type ImportResult = {
  venues: { created: number; updated: number; errors: string[] };
  events: { created: number; updated: number; errors: string[] };
  warnings: ImportWarning[];
  dryRun: boolean;
  source: string;
  targetCitiesTouched: string[];
  targetCityImpact: TargetCityImpact[];
};

type ResolvedImportOptions = {
  dryRun: boolean;
  strictTargetCities: boolean;
  maxVenues: number;
  maxEvents: number;
  actorId: string | null;
  source: string;
  logRun: boolean;
};

type ImportInspection = {
  warnings: ImportWarning[];
  venueDuplicates: Set<string>;
  eventDuplicates: Set<string>;
  targetCityImpact: Map<string, Omit<TargetCityImpact, "currentCoverageScore" | "postImportCoverageScore" | "coverageDelta">>;
  fatalErrors: string[];
};

type EventUpsertContext = {
  dryRun: boolean;
  plannedVenueKeys: Set<string>;
};

const VALID_VENUE_TYPES = ["CLUB", "THEATER", "BAR", "FESTIVAL", "OPEN_MIC"] as const;
const VALID_SHOW_TYPES = ["HEADLINE", "FEATURE", "OPEN_MIC", "FESTIVAL", "PODCAST_LIVE"] as const;
const DEFAULT_MAX_VENUES = 150;
const DEFAULT_MAX_EVENTS = 400;

const venueImportSchema = z.object({
  name: z.string().trim().min(1),
  address: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1),
  state: z.string().trim().min(2).max(32),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  capacity: z.number().int().positive().max(50000).optional(),
  website: z.string().url().optional(),
  type: z.enum(VALID_VENUE_TYPES).optional(),
  photos: z.array(z.object({
    url: z.string().url(),
    caption: z.string().trim().max(200).optional(),
  })).optional(),
  socialLinks: z.array(z.object({
    platform: z.string().trim().min(1).max(40),
    url: z.string().url(),
  })).optional(),
});

const eventImportSchema = z.object({
  venue: z.object({
    name: z.string().trim().min(1),
    city: z.string().trim().min(1),
    state: z.string().trim().min(2).max(32),
  }),
  date: z.string().trim().min(1),
  showtime: z.string().trim().min(1).optional(),
  ticketUrl: z.string().url().optional(),
  priceMin: z.number().nonnegative().optional(),
  priceMax: z.number().nonnegative().optional(),
  showType: z.enum(VALID_SHOW_TYPES).optional(),
  title: z.string().trim().max(200).optional(),
  comedians: z.array(z.object({
    slug: z.string().trim().min(1),
    role: z.string().trim().min(1).max(50).optional(),
  })).min(1),
}).superRefine((value, ctx) => {
  if (
    value.priceMin != null &&
    value.priceMax != null &&
    value.priceMin > value.priceMax
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["priceMin"],
      message: "priceMin cannot exceed priceMax",
    });
  }
});

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function normalizeState(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase().slice(0, 2);
}

function buildVenueKey(item: { name: string; city: string; state: string }) {
  return [normalizeText(item.name), normalizeText(item.city), normalizeState(item.state)].join("|");
}

function buildEventKey(item: EventImportItem) {
  return [
    buildVenueKey(item.venue),
    item.date.trim(),
    normalizeText(item.showtime),
  ].join("|");
}

function createWarning(
  code: string,
  scope: "payload" | "venue" | "event",
  message: string,
): ImportWarning {
  return { code, scope, message };
}

function getTargetCityDetails(item: VenueImportItem | EventImportItem) {
  const city = "venue" in item ? item.venue.city : item.city;
  const state = "venue" in item ? item.venue.state : item.state;
  return matchTargetCity(city, state);
}

function recordTargetCityImpact(
  impact: Map<string, Omit<TargetCityImpact, "currentCoverageScore" | "postImportCoverageScore" | "coverageDelta">>,
  item: VenueImportItem | EventImportItem,
  key: "venueImports" | "eventImports",
) {
  const targetCity = getTargetCityDetails(item);
  if (!targetCity) return;

  const current = impact.get(targetCity.slug) ?? {
    slug: targetCity.slug,
    label: targetCity.label,
    shortLabel: targetCity.shortLabel,
    venueImports: 0,
    eventImports: 0,
  };
  current[key] += 1;
  impact.set(targetCity.slug, current);
}

function buildTargetCityImpactList(
  impact: Map<string, Omit<TargetCityImpact, "currentCoverageScore" | "postImportCoverageScore" | "coverageDelta">>,
  beforeCoverage: Map<string, number>,
  afterCoverage: Map<string, number> | null,
) {
  return Array.from(impact.values())
    .map((entry) => {
      const before = beforeCoverage.get(entry.slug) ?? null;
      const after = afterCoverage ? afterCoverage.get(entry.slug) ?? before : before;
      return {
        ...entry,
        currentCoverageScore: before,
        postImportCoverageScore: after,
        coverageDelta:
          before != null && after != null ? Math.round((after - before) * 100) / 100 : null,
      };
    })
    .sort((a, b) => a.shortLabel.localeCompare(b.shortLabel));
}

async function getCoverageMapForTouchedCities(touchedSlugs: string[]) {
  if (touchedSlugs.length === 0) {
    return new Map<string, number>();
  }

  const coverage = await getTargetCityCoverage();
  return new Map(
    coverage
      .filter((city) => touchedSlugs.includes(city.city.slug))
      .map((city) => [city.city.slug, city.coverageScore]),
  );
}

export function resolveImportOptions(options: ImportOptions = {}): ResolvedImportOptions {
  return {
    dryRun: options.dryRun ?? false,
    strictTargetCities:
      options.strictTargetCities ??
      parseBoolean(process.env.IMPORT_STRICT_TARGET_CITIES, false),
    maxVenues: options.maxVenues ?? parsePositiveInt(process.env.IMPORT_MAX_VENUES, DEFAULT_MAX_VENUES),
    maxEvents: options.maxEvents ?? parsePositiveInt(process.env.IMPORT_MAX_EVENTS, DEFAULT_MAX_EVENTS),
    actorId: options.actorId ?? null,
    source: options.source?.trim() || "bulk-import",
    logRun: options.logRun ?? true,
  };
}

export function inspectImportPayload(
  payload: ImportPayload,
  options: ImportOptions = {},
): ImportInspection {
  const resolved = resolveImportOptions(options);
  const warnings: ImportWarning[] = [];
  const fatalErrors: string[] = [];
  const venueDuplicates = new Set<string>();
  const eventDuplicates = new Set<string>();
  const targetCityImpact = new Map<
    string,
    Omit<TargetCityImpact, "currentCoverageScore" | "postImportCoverageScore" | "coverageDelta">
  >();

  const venues = payload.venues ?? [];
  const events = payload.events ?? [];

  if (venues.length > resolved.maxVenues) {
    fatalErrors.push(
      `Venue import exceeds guardrail: received ${venues.length}, max ${resolved.maxVenues}.`,
    );
  }

  if (events.length > resolved.maxEvents) {
    fatalErrors.push(
      `Event import exceeds guardrail: received ${events.length}, max ${resolved.maxEvents}.`,
    );
  }

  const venueSeen = new Set<string>();
  const eventSeen = new Set<string>();

  for (const [index, item] of venues.entries()) {
    const parsed = venueImportSchema.safeParse(item);
    if (!parsed.success) {
      warnings.push(
        createWarning(
          "invalid-venue-shape",
          "venue",
          `Venue ${index + 1} failed validation and will be skipped.`,
        ),
      );
      continue;
    }

    const normalized = parsed.data;
    const key = buildVenueKey(normalized);
    if (venueSeen.has(key)) {
      venueDuplicates.add(key);
      warnings.push(
        createWarning(
          "duplicate-venue",
          "venue",
          `Duplicate venue in payload: ${normalized.name} (${normalized.city}, ${normalizeState(normalized.state)}).`,
        ),
      );
      continue;
    }

    venueSeen.add(key);
    recordTargetCityImpact(targetCityImpact, normalized, "venueImports");

    const targetCity = getTargetCityDetails(normalized);
    if (!targetCity) {
      const message = `Non-target city venue import: ${normalized.name} (${normalized.city}, ${normalizeState(normalized.state)}).`;
      if (resolved.strictTargetCities) {
        fatalErrors.push(message);
      } else {
        warnings.push(createWarning("non-target-venue", "venue", message));
      }
    }
  }

  for (const [index, item] of events.entries()) {
    const parsed = eventImportSchema.safeParse(item);
    if (!parsed.success) {
      warnings.push(
        createWarning(
          "invalid-event-shape",
          "event",
          `Event ${index + 1} failed validation and will be skipped.`,
        ),
      );
      continue;
    }

    const normalized = parsed.data;
    const key = buildEventKey(normalized);
    if (eventSeen.has(key)) {
      eventDuplicates.add(key);
      warnings.push(
        createWarning(
          "duplicate-event",
          "event",
          `Duplicate event in payload: ${normalized.venue.name} on ${normalized.date}.`,
        ),
      );
      continue;
    }

    eventSeen.add(key);
    recordTargetCityImpact(targetCityImpact, normalized, "eventImports");

    const eventDate = new Date(normalized.date);
    if (!Number.isNaN(eventDate.getTime())) {
      const daysUntilEvent = Math.round(
        (eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      if (daysUntilEvent < -2) {
        warnings.push(
          createWarning(
            "past-event",
            "event",
            `Event appears to be in the past: ${normalized.venue.name} on ${normalized.date}.`,
          ),
        );
      }
      if (daysUntilEvent > 365) {
        warnings.push(
          createWarning(
            "far-future-event",
            "event",
            `Event is scheduled more than a year out: ${normalized.venue.name} on ${normalized.date}.`,
          ),
        );
      }
    }

    const targetCity = getTargetCityDetails(normalized);
    if (!targetCity) {
      const message = `Non-target city event import: ${normalized.venue.name} (${normalized.venue.city}, ${normalizeState(normalized.venue.state)}).`;
      if (resolved.strictTargetCities) {
        fatalErrors.push(message);
      } else {
        warnings.push(createWarning("non-target-event", "event", message));
      }
    }
  }

  return {
    warnings,
    venueDuplicates,
    eventDuplicates,
    targetCityImpact,
    fatalErrors,
  };
}

async function upsertVenue(
  item: VenueImportItem,
  dryRun: boolean,
): Promise<{ created: boolean; id: string }> {
  const venueType = item.type && VALID_VENUE_TYPES.includes(item.type) ? item.type : "CLUB";
  const data = {
    name: item.name.trim(),
    address: item.address?.trim() ?? null,
    city: item.city.trim(),
    state: normalizeState(item.state),
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
    capacity: item.capacity ?? null,
    website: item.website?.trim() ?? null,
    type: venueType as VenueType,
  };

  const existing = await prisma.venue.findFirst({
    where: {
      name: { equals: data.name, mode: "insensitive" },
      city: { equals: data.city, mode: "insensitive" },
      state: { equals: data.state, mode: "insensitive" },
    },
  });

  if (dryRun) {
    return { created: !existing, id: existing?.id ?? `planned:${buildVenueKey(data)}` };
  }

  if (existing) {
    const updateData: Parameters<typeof prisma.venue.update>[0]["data"] = { ...data };
    if (item.photos && item.photos.length > 0) {
      updateData.photos = {
        deleteMany: {},
        create: item.photos.map((photo, index) => ({
          url: photo.url,
          caption: photo.caption ?? null,
          sortOrder: index,
        })),
      };
    }
    if (item.socialLinks && item.socialLinks.length > 0) {
      updateData.socialLinks = {
        deleteMany: {},
        create: item.socialLinks.map((link) => ({
          platform: link.platform,
          url: link.url,
        })),
      };
    }
    await prisma.venue.update({
      where: { id: existing.id },
      data: updateData,
    });
    return { created: false, id: existing.id };
  }

  const venue = await prisma.venue.create({
    data: {
      ...data,
      photos: item.photos?.length
        ? {
            create: item.photos.map((photo, index) => ({
              url: photo.url,
              caption: photo.caption ?? null,
              sortOrder: index,
            })),
          }
        : undefined,
      socialLinks: item.socialLinks?.length
        ? {
            create: item.socialLinks.map((link) => ({
              platform: link.platform,
              url: link.url,
            })),
          }
        : undefined,
    },
  });
  return { created: true, id: venue.id };
}

async function resolveVenueId(
  ref: { name: string; city: string; state: string },
  plannedVenueKeys: Set<string>,
) {
  const venue = await prisma.venue.findFirst({
    where: {
      name: { equals: ref.name.trim(), mode: "insensitive" },
      city: { equals: ref.city.trim(), mode: "insensitive" },
      state: { equals: normalizeState(ref.state), mode: "insensitive" },
    },
  });

  if (venue) {
    return { venueId: venue.id, planned: false };
  }

  if (plannedVenueKeys.has(buildVenueKey(ref))) {
    return { venueId: null, planned: true };
  }

  return { venueId: null, planned: false };
}

async function resolveComedian(slug: string) {
  const comedian = await prisma.comedian.findUnique({
    where: { slug: slug.trim().toLowerCase() },
  });
  return comedian?.id ?? null;
}

async function upsertEvent(
  item: EventImportItem,
  context: EventUpsertContext,
): Promise<{ created: boolean }> {
  const venueResolution = await resolveVenueId(item.venue, context.plannedVenueKeys);
  if (!venueResolution.venueId && !venueResolution.planned) {
    throw new Error(
      `Venue not found: ${item.venue.name}, ${item.venue.city}, ${item.venue.state}. Import venues first.`,
    );
  }

  const date = new Date(item.date);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${item.date}`);
  }

  const showType =
    item.showType && VALID_SHOW_TYPES.includes(item.showType) ? item.showType : "HEADLINE";
  const comedianIds: Array<{ comedianId: string; role: string }> = [];

  for (const ref of item.comedians || []) {
    const comedianId = await resolveComedian(ref.slug);
    if (!comedianId) {
      throw new Error(`Comedian not found: ${ref.slug}. Add comedians before importing events.`);
    }
    comedianIds.push({ comedianId, role: ref.role ?? "headline" });
  }

  const showtime = item.showtime?.trim() ?? null;
  const eventData = {
    venueId: venueResolution.venueId ?? "planned",
    date,
    showtime,
    ticketUrl: item.ticketUrl?.trim() ?? null,
    priceMin: item.priceMin ?? null,
    priceMax: item.priceMax ?? null,
    showType: showType as ShowType,
    title: item.title?.trim() ?? null,
  };

  if (context.dryRun) {
    if (!venueResolution.venueId) {
      return { created: true };
    }

    const existingPreview = await prisma.event.findFirst({
      where: {
        venueId: venueResolution.venueId,
        date,
        showtime,
      },
    });

    return { created: !existingPreview };
  }

  if (!venueResolution.venueId) {
    throw new Error(
      `Venue not found after venue import step: ${item.venue.name}, ${item.venue.city}, ${item.venue.state}.`,
    );
  }

  const existing = await prisma.event.findFirst({
    where: {
      venueId: venueResolution.venueId,
      date,
      showtime,
    },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.event.update({
        where: { id: existing.id },
        data: {
          ...eventData,
          venueId: venueResolution.venueId,
        },
      }),
      prisma.eventComedian.deleteMany({ where: { eventId: existing.id } }),
      prisma.eventComedian.createMany({
        data: comedianIds.map((comedian) => ({
          eventId: existing.id,
          comedianId: comedian.comedianId,
          role: comedian.role,
        })),
      }),
    ]);
    return { created: false };
  }

  await prisma.event.create({
    data: {
      ...eventData,
      venueId: venueResolution.venueId,
      comedians: {
        create: comedianIds.map((comedian) => ({
          comedianId: comedian.comedianId,
          role: comedian.role,
        })),
      },
    },
  });

  return { created: true };
}

async function recordImportRun(
  payload: ImportPayload,
  result: ImportResult,
  options: ResolvedImportOptions,
) {
  if (!options.logRun) return;

  try {
    await prisma.analyticsEvent.create({
      data: {
        entityType: "ops:import",
        entityId: options.source,
        action: options.dryRun ? "import_preview" : "import_run",
        userId: options.actorId,
        metadata: JSON.stringify({
          dryRun: options.dryRun,
          source: options.source,
          venuesRequested: payload.venues?.length ?? 0,
          eventsRequested: payload.events?.length ?? 0,
          venueCreates: result.venues.created,
          venueUpdates: result.venues.updated,
          venueErrors: result.venues.errors.length,
          eventCreates: result.events.created,
          eventUpdates: result.events.updated,
          eventErrors: result.events.errors.length,
          warnings: result.warnings.map((warning) => warning.message).slice(0, 20),
          targetCitiesTouched: result.targetCitiesTouched,
          targetCityImpact: result.targetCityImpact,
        }),
      },
    });
  } catch {
    // Audit logging should never block the import itself.
  }
}

export async function runBulkImport(
  payload: ImportPayload,
  options: ImportOptions = {},
): Promise<ImportResult> {
  const resolved = resolveImportOptions(options);
  const inspection = inspectImportPayload(payload, resolved);

  if (inspection.fatalErrors.length > 0) {
    throw new Error(inspection.fatalErrors.join(" "));
  }

  const result: ImportResult = {
    venues: { created: 0, updated: 0, errors: [] },
    events: { created: 0, updated: 0, errors: [] },
    warnings: inspection.warnings,
    dryRun: resolved.dryRun,
    source: resolved.source,
    targetCitiesTouched: Array.from(inspection.targetCityImpact.keys()),
    targetCityImpact: [],
  };

  const touchedSlugs = Array.from(inspection.targetCityImpact.keys());
  const beforeCoverage = await getCoverageMapForTouchedCities(touchedSlugs);
  const plannedVenueKeys = new Set<string>();

  for (const item of payload.venues ?? []) {
    const parsed = venueImportSchema.safeParse(item);
    if (!parsed.success) {
      result.venues.errors.push(
        `${item.name ?? "Unknown venue"}: ${z.prettifyError(parsed.error)}`,
      );
      continue;
    }

    const normalized = parsed.data;
    const venueKey = buildVenueKey(normalized);
    if (inspection.venueDuplicates.has(venueKey)) {
      continue;
    }

    plannedVenueKeys.add(venueKey);

    try {
      const { created } = await upsertVenue(normalized, resolved.dryRun);
      if (created) {
        result.venues.created += 1;
      } else {
        result.venues.updated += 1;
      }
    } catch (error) {
      result.venues.errors.push(`${normalized.name}: ${(error as Error).message}`);
    }
  }

  for (const item of payload.events ?? []) {
    const parsed = eventImportSchema.safeParse(item);
    if (!parsed.success) {
      result.events.errors.push(
        `${item.venue?.name ?? "Unknown venue"} ${item.date ?? ""}: ${z.prettifyError(parsed.error)}`,
      );
      continue;
    }

    const normalized = parsed.data;
    const eventKey = buildEventKey(normalized);
    if (inspection.eventDuplicates.has(eventKey)) {
      continue;
    }

    try {
      const { created } = await upsertEvent(normalized, {
        dryRun: resolved.dryRun,
        plannedVenueKeys,
      });
      if (created) {
        result.events.created += 1;
      } else {
        result.events.updated += 1;
      }
    } catch (error) {
      result.events.errors.push(
        `${normalized.venue.name} ${normalized.date}: ${(error as Error).message}`,
      );
    }
  }

  const afterCoverage = resolved.dryRun
    ? null
    : await getCoverageMapForTouchedCities(touchedSlugs);

  result.targetCityImpact = buildTargetCityImpactList(
    inspection.targetCityImpact,
    beforeCoverage,
    afterCoverage,
  );

  await recordImportRun(payload, result, resolved);
  return result;
}
