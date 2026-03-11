import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

/* ─── Talent Listings ─────────────────────────────────────────────── */

export async function getTalentListings(filters?: {
  city?: string;
  state?: string;
  genre?: string;
  showType?: string;
  page?: number;
  limit?: number;
}) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { status: "open" };

  if (filters?.genre) where.genre = filters.genre;
  if (filters?.showType) where.showType = filters.showType;

  // City/state filtering requires joining through venue; use raw filter
  // We'll filter via a sub-query approach using venueId in
  let venueIds: string[] | undefined;
  if (filters?.city || filters?.state) {
    const venues = await prisma.venue.findMany({
      where: {
        ...(filters.city && { city: { equals: filters.city, mode: "insensitive" as const } }),
        ...(filters.state && { state: { equals: filters.state, mode: "insensitive" as const } }),
      },
      select: { id: true },
    });
    venueIds = venues.map((v) => v.id);
    where.venueId = { in: venueIds };
  }

  const [listings, total] = await Promise.all([
    prisma.talentListing.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: "asc" },
    }),
    prisma.talentListing.count({ where }),
  ]);

  return { listings, total, page, pages: Math.ceil(total / limit) };
}

export async function createTalentListing(
  venueId: string,
  data: {
    date: Date;
    showType: string;
    genre?: string;
    budgetMin?: number;
    budgetMax?: number;
    description?: string;
  }
) {
  return prisma.talentListing.create({
    data: {
      venueId,
      date: data.date,
      showType: data.showType,
      genre: data.genre,
      budgetMin: data.budgetMin,
      budgetMax: data.budgetMax,
      description: data.description,
    },
  });
}

/* ─── Talent Applications ─────────────────────────────────────────── */

export async function applyToListing(
  listingId: string,
  comedianId: string,
  userId: string,
  message?: string,
  askingFee?: number
) {
  return prisma.talentApplication.create({
    data: {
      listingId,
      comedianId,
      userId,
      message,
      askingFee,
    },
  });
}

export async function getApplications(listingId: string) {
  return prisma.talentApplication.findMany({
    where: { listingId },
    orderBy: { createdAt: "desc" },
  });
}

export async function respondToApplication(
  applicationId: string,
  status: "accepted" | "rejected"
) {
  return prisma.talentApplication.update({
    where: { id: applicationId },
    data: { status },
  });
}

/* ─── Venue CRM ───────────────────────────────────────────────────── */

export async function getVenueCRMData(
  venueId: string,
  page = 1,
  limit = 20
) {
  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    prisma.venueCRM.findMany({
      where: { venueId },
      skip,
      take: limit,
      orderBy: { lastVisit: "desc" },
    }),
    prisma.venueCRM.count({ where: { venueId } }),
  ]);

  return { records, total, page, pages: Math.ceil(total / limit) };
}

export async function updateCRMRecord(
  venueId: string,
  userId: string,
  data: { tags?: string; notes?: string }
) {
  return prisma.venueCRM.upsert({
    where: { venueId_userId: { venueId, userId } },
    update: {
      ...(data.tags !== undefined && { tags: data.tags }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
    create: {
      venueId,
      userId,
      lastVisit: new Date(),
      tags: data.tags,
      notes: data.notes,
    },
  });
}

/* ─── Industry Reports ────────────────────────────────────────────── */

export async function getIndustryReport(
  city: string,
  state: string,
  quarter: string
) {
  return prisma.industryReport.findUnique({
    where: { city_state_quarter: { city, state, quarter } },
  });
}

export async function generateIndustryMetrics(city: string, state: string) {
  // Fetch venues in city
  const venues = await prisma.venue.findMany({
    where: { city: { equals: city, mode: "insensitive" }, state: { equals: state, mode: "insensitive" } },
    select: { id: true },
  });
  const venueIds = venues.map((v) => v.id);

  // Get events for those venues
  const events = await prisma.event.findMany({
    where: { venueId: { in: venueIds } },
    select: { id: true, priceMin: true, priceMax: true },
  });

  const prices = events
    .map((e) => Number(e.priceMin ?? e.priceMax ?? 0))
    .filter((p) => p > 0);

  const avgTicketPrice =
    prices.length > 0
      ? prices.reduce((a, b) => a + b, 0) / prices.length
      : 0;

  // Top comedians by event count in this city
  const eventIds = events.map((e) => e.id);
  const lineups = await prisma.eventComedian.findMany({
    where: { eventId: { in: eventIds } },
    select: { comedianId: true },
  });

  const comedianCounts: Record<string, number> = {};
  for (const l of lineups) {
    comedianCounts[l.comedianId] = (comedianCounts[l.comedianId] || 0) + 1;
  }

  const topComedianIds = Object.entries(comedianCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id);

  const topComedians = await prisma.comedian.findMany({
    where: { id: { in: topComedianIds } },
    select: { id: true, name: true },
  });

  return {
    totalShows: events.length,
    venueCount: venues.length,
    avgTicketPrice: Math.round(avgTicketPrice * 100) / 100,
    topComedians: topComedians.map((c) => ({
      id: c.id,
      name: c.name,
      showCount: comedianCounts[c.id] || 0,
    })),
  };
}

/* ─── Venue Groups ────────────────────────────────────────────────── */

export async function getVenueGroup(groupId: string) {
  return prisma.venueGroup.findUnique({
    where: { id: groupId },
    include: { venues: true, staff: true },
  });
}

export async function createVenueGroup(ownerId: string, name: string) {
  return prisma.venueGroup.create({
    data: {
      name,
      ownerId,
      staff: {
        create: { userId: ownerId, role: "owner" },
      },
    },
    include: { staff: true },
  });
}

/* ─── Agent Roster ────────────────────────────────────────────────── */

export async function getAgentRoster(userId: string) {
  return prisma.agentRoster.findMany({
    where: { userId },
    include: { comedian: true },
    orderBy: { startDate: "desc" },
  });
}

/* ─── API Keys ────────────────────────────────────────────────────── */

export async function createApiKey(
  userId: string,
  name: string,
  tier = "free"
) {
  const key = `pa_${tier}_${randomBytes(24).toString("hex")}`;
  const rateLimit = tier === "enterprise" ? 10000 : tier === "pro" ? 1000 : 100;

  return prisma.apiKey.create({
    data: {
      userId,
      name,
      key,
      tier,
      rateLimit,
    },
  });
}
