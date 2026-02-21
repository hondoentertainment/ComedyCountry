import { prisma } from "./prisma";
import type { VenueType, ShowType } from "@prisma/client";

// =============================================================================
// Import Types
// =============================================================================

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
  date: string; // ISO date or "YYYY-MM-DD"
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

export type ImportResult = {
  venues: { created: number; updated: number; errors: string[] };
  events: { created: number; updated: number; errors: string[] };
};

const VALID_VENUE_TYPES = ["CLUB", "THEATER", "BAR", "FESTIVAL", "OPEN_MIC"];
const VALID_SHOW_TYPES = ["HEADLINE", "FEATURE", "OPEN_MIC", "FESTIVAL", "PODCAST_LIVE"];

// =============================================================================
// Venue Import
// =============================================================================

async function upsertVenue(item: VenueImportItem): Promise<{ created: boolean; id: string }> {
  const venueType = item.type && VALID_VENUE_TYPES.includes(item.type) ? item.type : "CLUB";
  const data = {
    name: item.name.trim(),
    address: item.address?.trim() ?? null,
    city: item.city.trim(),
    state: item.state.trim().toUpperCase().slice(0, 2),
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

  if (existing) {
    const updateData: Parameters<typeof prisma.venue.update>[0]["data"] = { ...data };
    if (item.photos && item.photos.length > 0) {
      updateData.photos = {
        deleteMany: {},
        create: item.photos.map((p, i) => ({
          url: p.url,
          caption: p.caption ?? null,
          sortOrder: i,
        })),
      };
    }
    if (item.socialLinks && item.socialLinks.length > 0) {
      updateData.socialLinks = {
        deleteMany: {},
        create: item.socialLinks.map((s) => ({ platform: s.platform, url: s.url })),
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
            create: item.photos.map((p, i) => ({
              url: p.url,
              caption: p.caption ?? null,
              sortOrder: i,
            })),
          }
        : undefined,
      socialLinks: item.socialLinks?.length
        ? {
            create: item.socialLinks.map((s) => ({
              platform: s.platform,
              url: s.url,
            })),
          }
        : undefined,
    },
  });
  return { created: true, id: venue.id };
}

// =============================================================================
// Event Import
// =============================================================================

async function resolveVenue(ref: { name: string; city: string; state: string }): Promise<string | null> {
  const venue = await prisma.venue.findFirst({
    where: {
      name: { equals: ref.name.trim(), mode: "insensitive" },
      city: { equals: ref.city.trim(), mode: "insensitive" },
      state: { equals: ref.state.trim().toUpperCase().slice(0, 2), mode: "insensitive" },
    },
  });
  return venue?.id ?? null;
}

async function resolveComedian(slug: string): Promise<string | null> {
  const comedian = await prisma.comedian.findUnique({
    where: { slug: slug.trim().toLowerCase() },
  });
  return comedian?.id ?? null;
}

async function upsertEvent(item: EventImportItem): Promise<{ created: boolean }> {
  const venueId = await resolveVenue(item.venue);
  if (!venueId) {
    throw new Error(
      `Venue not found: ${item.venue.name}, ${item.venue.city}, ${item.venue.state}. Import venues first.`
    );
  }

  const date = new Date(item.date);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${item.date}`);
  }

  const showType =
    item.showType && VALID_SHOW_TYPES.includes(item.showType) ? item.showType : "HEADLINE";

  const comedianIds: { comedianId: string; role: string }[] = [];
  for (const ref of item.comedians || []) {
    const comedianId = await resolveComedian(ref.slug);
    if (!comedianId) {
      throw new Error(`Comedian not found: ${ref.slug}. Add comedians before importing events.`);
    }
    comedianIds.push({ comedianId, role: ref.role ?? "headline" });
  }

  const showtime = item.showtime?.trim() ?? null;

  const existing = await prisma.event.findFirst({
    where: {
      venueId,
      date,
      showtime,
    },
  });

  const eventData = {
    venueId,
    date,
    showtime,
    ticketUrl: item.ticketUrl?.trim() ?? null,
    priceMin: item.priceMin ?? null,
    priceMax: item.priceMax ?? null,
    showType: showType as ShowType,
    title: item.title?.trim() ?? null,
  };

  if (existing) {
    await prisma.$transaction([
      prisma.event.update({
        where: { id: existing.id },
        data: eventData,
      }),
      prisma.eventComedian.deleteMany({ where: { eventId: existing.id } }),
      prisma.eventComedian.createMany({
        data: comedianIds.map((c) => ({ eventId: existing.id, ...c })),
      }),
    ]);
    return { created: false };
  }

  await prisma.event.create({
    data: {
      ...eventData,
      comedians: {
        create: comedianIds.map((c) => ({ comedianId: c.comedianId, role: c.role })),
      },
    },
  });
  return { created: true };
}

// =============================================================================
// Main Import
// =============================================================================

export async function runBulkImport(payload: ImportPayload): Promise<ImportResult> {
  const result: ImportResult = {
    venues: { created: 0, updated: 0, errors: [] },
    events: { created: 0, updated: 0, errors: [] },
  };

  // Import venues first (events depend on them)
  for (const item of payload.venues ?? []) {
    try {
      if (!item.name?.trim() || !item.city?.trim() || !item.state?.trim()) {
        result.venues.errors.push(`Invalid venue: missing name, city, or state`);
        continue;
      }
      const { created } = await upsertVenue(item);
      if (created) result.venues.created++;
      else result.venues.updated++;
    } catch (err) {
      result.venues.errors.push(`${item.name}: ${(err as Error).message}`);
    }
  }

  // Import events
  for (const item of payload.events ?? []) {
    try {
      if (!item.venue?.name?.trim() || !item.venue?.city?.trim() || !item.venue?.state?.trim()) {
        result.events.errors.push(`Invalid event: missing venue name, city, or state`);
        continue;
      }
      if (!item.date) {
        result.events.errors.push(`Invalid event at ${item.venue.name}: missing date`);
        continue;
      }
      if (!item.comedians?.length) {
        result.events.errors.push(`Invalid event at ${item.venue.name} on ${item.date}: no comedians`);
        continue;
      }
      const { created } = await upsertEvent(item);
      if (created) result.events.created++;
      else result.events.updated++;
    } catch (err) {
      result.events.errors.push(`${item.venue?.name} ${item.date}: ${(err as Error).message}`);
    }
  }

  return result;
}
