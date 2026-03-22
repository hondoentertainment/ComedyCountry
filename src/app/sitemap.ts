import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const siteUrl = process.env.NEXTAUTH_URL ?? "https://punchline-atlas.vercel.app";
const URLS_PER_SITEMAP = 50_000;

const staticRoutes: MetadataRoute.Sitemap = [
  { url: siteUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
  { url: `${siteUrl}/venues`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
  { url: `${siteUrl}/comedians`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
  { url: `${siteUrl}/schedule`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
  { url: `${siteUrl}/trending`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
  { url: `${siteUrl}/specials`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
  { url: `${siteUrl}/lists`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
  { url: `${siteUrl}/open-mics`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
  { url: `${siteUrl}/festivals`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
  { url: `${siteUrl}/compare`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
  { url: `${siteUrl}/pricing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${siteUrl}/comedian-dashboard`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
  { url: `${siteUrl}/map`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
  { url: `${siteUrl}/search`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
  { url: `${siteUrl}/auth/signin`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  { url: `${siteUrl}/auth/signup`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  { url: `${siteUrl}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  { url: `${siteUrl}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
];

async function getTotalDynamicUrlCount(): Promise<number> {
  try {
    const [venueCount, comedianCount, eventCount] = await Promise.all([
      prisma.venue.count(),
      prisma.comedian.count(),
      prisma.event.count({ where: { date: { gte: new Date() } } }),
    ]);
    return venueCount + comedianCount + eventCount;
  } catch {
    return 0;
  }
}

export async function generateSitemaps() {
  const totalDynamic = await getTotalDynamicUrlCount();
  // Sitemap 0 holds static routes + the first batch of dynamic URLs
  const totalUrls = staticRoutes.length + totalDynamic;
  const count = Math.max(1, Math.ceil(totalUrls / URLS_PER_SITEMAP));
  return Array.from({ length: count }, (_, i) => ({ id: i }));
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  // Sitemap 0 includes static routes; remaining capacity is filled with dynamic URLs
  const isFirstPage = id === 0;
  const staticCount = isFirstPage ? staticRoutes.length : 0;
  const dynamicLimit = URLS_PER_SITEMAP - staticCount;

  // Calculate the global dynamic offset: page 0 starts at 0, page 1 starts after
  // the first page's dynamic capacity, etc.
  const firstPageDynamicCapacity = URLS_PER_SITEMAP - staticRoutes.length;
  const dynamicOffset = isFirstPage ? 0 : firstPageDynamicCapacity + (id - 1) * URLS_PER_SITEMAP;

  let dynamicRoutes: MetadataRoute.Sitemap = [];

  try {
    // Get total counts to determine which entity range this offset falls into
    const [venueCount, comedianCount] = await Promise.all([
      prisma.venue.count(),
      prisma.comedian.count(),
    ]);

    let remaining = dynamicLimit;
    let offset = dynamicOffset;

    // Venues
    if (offset < venueCount && remaining > 0) {
      const take = Math.min(remaining, venueCount - offset);
      const venues = await prisma.venue.findMany({
        select: { id: true, updatedAt: true },
        skip: offset,
        take,
        orderBy: { id: "asc" },
      });
      dynamicRoutes.push(
        ...venues.map((v) => ({
          url: `${siteUrl}/venues/${v.id}`,
          lastModified: v.updatedAt,
          changeFrequency: "weekly" as const,
          priority: 0.8,
        }))
      );
      remaining -= venues.length;
      offset = 0; // consumed venue offset
    } else {
      offset -= venueCount;
    }

    // Comedians
    if (offset < comedianCount && remaining > 0) {
      const take = Math.min(remaining, comedianCount - offset);
      const comedians = await prisma.comedian.findMany({
        select: { slug: true, updatedAt: true },
        skip: offset,
        take,
        orderBy: { slug: "asc" },
      });
      dynamicRoutes.push(
        ...comedians.map((c) => ({
          url: `${siteUrl}/comedians/${c.slug}`,
          lastModified: c.updatedAt,
          changeFrequency: "weekly" as const,
          priority: 0.8,
        }))
      );
      remaining -= comedians.length;
      offset = 0;
    } else {
      offset -= comedianCount;
    }

    // Events (future only)
    if (remaining > 0) {
      const events = await prisma.event.findMany({
        where: { date: { gte: new Date() } },
        select: { id: true, updatedAt: true },
        skip: Math.max(0, offset),
        take: remaining,
        orderBy: { id: "asc" },
      });
      dynamicRoutes.push(
        ...events.map((e) => ({
          url: `${siteUrl}/events/${e.id}`,
          lastModified: e.updatedAt,
          changeFrequency: "weekly" as const,
          priority: 0.7,
        }))
      );
    }
  } catch {
    // DB not configured (e.g. build without DATABASE_URL)
  }

  return isFirstPage ? [...staticRoutes, ...dynamicRoutes] : dynamicRoutes;
}
