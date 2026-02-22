import { prisma } from "./prisma";
import type { TouringStatus, Prisma } from "@prisma/client";

type ListComediansParams = {
  touringStatus?: TouringStatus;
  genre?: string;
  search?: string;
  take?: number;
  skip?: number;
};

export async function listComedians(params: ListComediansParams = {}) {
  const { touringStatus, genre, search, take = 50, skip = 0 } = params;

  const where: Prisma.ComedianWhereInput = {};

  if (touringStatus) where.touringStatus = touringStatus;
  if (genre)
    where.genres = { some: { genre: { contains: genre, mode: "insensitive" } } };
  if (search)
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ];

  const [comedians, total] = await Promise.all([
    prisma.comedian.findMany({
      where,
      take,
      skip,
      orderBy: { name: "asc" },
      include: {
        genres: true,
        _count: { select: { events: true } },
      },
    }),
    prisma.comedian.count({ where }),
  ]);

  return { comedians, total };
}

export async function getComedian(slug: string) {
  return prisma.comedian.findUnique({
    where: { slug },
    include: {
      genres: true,
      socialLinks: true,
      podcastLinks: true,
      specialReleases: { orderBy: { releaseYear: "desc" } },
      youtubeChannel: true,
      events: {
        where: { event: { date: { gte: new Date() } } },
        orderBy: { event: { date: "asc" } },
        take: 20,
        include: {
          event: {
            include: { venue: true },
          },
        },
      },
    },
  });
}
