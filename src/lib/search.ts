import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

export type SearchResult = {
  venues: Array<{
    id: string;
    name: string;
    city: string;
    state: string;
    type: string;
  }>;
  comedians: Array<{
    id: string;
    name: string;
    slug: string;
    headshotUrl: string | null;
  }>;
  events: Array<{
    id: string;
    title: string | null;
    date: Date;
    venue: { name: string; city: string; state: string };
    comedians: Array<{ comedian: { name: string } }>;
  }>;
};

export async function search(q: string, take = 5): Promise<SearchResult> {
  const term = q.trim().toLowerCase();
  if (!term || term.length < 2) {
    return { venues: [], comedians: [], events: [] };
  }

  const searchWhere: Prisma.EventWhereInput = {
    date: { gte: new Date() },
    OR: [
      { title: { contains: term, mode: "insensitive" } },
      { comedians: { some: { comedian: { name: { contains: term, mode: "insensitive" } } } } },
      { venue: { name: { contains: term, mode: "insensitive" } } },
      { venue: { city: { contains: term, mode: "insensitive" } } },
    ],
  };

  const [venues, comedians, events] = await Promise.all([
    prisma.venue.findMany({
      where: {
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { city: { contains: term, mode: "insensitive" } },
          { state: { contains: term, mode: "insensitive" } },
        ],
      },
      take,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        type: true,
      },
    }),
    prisma.comedian.findMany({
      where: {
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { slug: { contains: term, mode: "insensitive" } },
        ],
      },
      take,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        headshotUrl: true,
      },
    }),
    prisma.event.findMany({
      where: searchWhere,
      take,
      orderBy: { date: "asc" },
      include: {
        venue: { select: { name: true, city: true, state: true } },
        comedians: { include: { comedian: { select: { name: true } } } },
      },
    }),
  ]);

  return {
    venues: venues.map((v) => ({ ...v, type: v.type })),
    comedians,
    events,
  };
}

export type AutocompleteType = "venue" | "comedian";

export type AutocompleteVenue = {
  id: string;
  name: string;
  city: string;
  state: string;
};

export type AutocompleteComedian = {
  id: string;
  name: string;
  slug: string;
  headshotUrl: string | null;
};

export async function autocomplete(
  q: string,
  type: AutocompleteType,
  take = 6,
): Promise<AutocompleteVenue[] | AutocompleteComedian[]> {
  const term = q.trim().toLowerCase();
  if (!term || term.length < 2) return [];

  if (type === "venue") {
    return prisma.venue.findMany({
      where: {
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { city: { contains: term, mode: "insensitive" } },
          { state: { contains: term, mode: "insensitive" } },
        ],
      },
      take,
      orderBy: { name: "asc" },
      select: { id: true, name: true, city: true, state: true },
    });
  }

  return prisma.comedian.findMany({
    where: {
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { slug: { contains: term, mode: "insensitive" } },
      ],
    },
    take,
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, headshotUrl: true },
  });
}
