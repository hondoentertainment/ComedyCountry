import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

type ListEventsParams = {
  from?: Date;
  to?: Date;
  venueId?: string;
  comedianId?: string;
  city?: string;
  state?: string;
  take?: number;
  skip?: number;
};

export async function listEvents(params: ListEventsParams = {}) {
  const {
    from = new Date(),
    to,
    venueId,
    comedianId,
    city,
    state,
    take = 50,
    skip = 0,
  } = params;

  const where: Prisma.EventWhereInput = {
    date: to ? { gte: from, lte: to } : { gte: from },
    ...(venueId && { venueId }),
    ...(comedianId && { comedians: { some: { comedianId } } }),
    ...((city || state) && {
      venue: {
        ...(city && { city: { contains: city, mode: "insensitive" as const } }),
        ...(state && { state: { equals: state, mode: "insensitive" as const } }),
      },
    }),
  };

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      take,
      skip,
      orderBy: { date: "asc" },
      include: {
        venue: true,
        comedians: {
          include: { comedian: true },
        },
      },
    }),
    prisma.event.count({ where }),
  ]);

  return { events, total };
}

export async function getEventById(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: {
      venue: true,
      comedians: {
        include: { comedian: true },
      },
    },
  });
}

/** Events from comedians or venues the user follows — for "For You" personalized feed */
export async function getEventsForUser(userId: string, take = 10) {
  const follows = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      followsComedians: { select: { comedianId: true } },
      followsVenues: { select: { venueId: true } },
    },
  });
  if (!follows) return { events: [], total: 0 };

  const comedianIds = follows.followsComedians.map((f) => f.comedianId);
  const venueIds = follows.followsVenues.map((f) => f.venueId);
  if (comedianIds.length === 0 && venueIds.length === 0) return { events: [], total: 0 };

  const where: Prisma.EventWhereInput = {
    date: { gte: new Date() },
    OR: [
      ...(comedianIds.length > 0
        ? [{ comedians: { some: { comedianId: { in: comedianIds } } } }]
        : []),
      ...(venueIds.length > 0 ? [{ venueId: { in: venueIds } }] : []),
    ],
  };

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      take,
      orderBy: { date: "asc" },
      include: {
        venue: true,
        comedians: { include: { comedian: true } },
      },
    }),
    prisma.event.count({ where }),
  ]);

  return { events, total };
}
