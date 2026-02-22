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
