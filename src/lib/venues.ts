import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import type { VenueType, Prisma } from "@prisma/client";

type ListVenuesParams = {
  state?: string;
  city?: string;
  type?: VenueType;
  capacityMin?: number;
  capacityMax?: number;
  search?: string;
  take?: number;
  skip?: number;
};

export async function listVenues(params: ListVenuesParams = {}) {
  const { state, city, type, capacityMin, capacityMax, search, take = 50, skip = 0 } = params;

  const where: Prisma.VenueWhereInput = {};

  if (state) where.state = { equals: state, mode: "insensitive" };
  if (city) where.city = { contains: city, mode: "insensitive" };
  if (type) where.type = type;
  if (capacityMin != null || capacityMax != null) {
    where.capacity = {};
    if (capacityMin != null) (where.capacity as { gte?: number }).gte = capacityMin;
    if (capacityMax != null) (where.capacity as { lte?: number }).lte = capacityMax;
  }
  if (search)
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
    ];

  const [venues, total] = await Promise.all([
    prisma.venue.findMany({
      where,
      take,
      skip,
      orderBy: [{ state: "asc" }, { city: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { events: true } },
        photos: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
    }),
    prisma.venue.count({ where }),
  ]);

  return { venues, total };
}

export async function getVenue(id: string) {
  return prisma.venue.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { sortOrder: "asc" } },
      socialLinks: true,
      events: {
        where: { date: { gte: new Date() } },
        orderBy: { date: "asc" },
        take: 10,
        include: {
          comedians: {
            include: { comedian: true },
          },
        },
      },
      _count: { select: { events: true } },
    },
  });
}

async function getVenueStatesUncached() {
  return prisma.venue.findMany({
    select: { state: true },
    distinct: ["state"],
    orderBy: { state: "asc" },
  });
}

export async function getVenueStates() {
  return unstable_cache(
    getVenueStatesUncached,
    ["venue-states"],
    { revalidate: 300 }
  )();
}

export async function listVenuesWithCoordinates(options?: { take?: number }) {
  const take = options?.take ?? 500;
  return prisma.venue.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
    },
    orderBy: [{ state: "asc" }, { city: "asc" }, { name: "asc" }],
    take,
  });
}
