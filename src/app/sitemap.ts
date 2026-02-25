import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const siteUrl = process.env.NEXTAUTH_URL ?? "https://punchline-atlas.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/venues`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/comedians`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/schedule`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/map`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/search`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/auth/signin`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/auth/signup`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  let dynamicRoutes: MetadataRoute.Sitemap = [];

  try {
    const [venueIds, comedianSlugs, eventIds] = await Promise.all([
      prisma.venue.findMany({ select: { id: true, updatedAt: true } }),
      prisma.comedian.findMany({ select: { slug: true, updatedAt: true } }),
      prisma.event.findMany({
        where: { date: { gte: new Date() } },
        select: { id: true, updatedAt: true },
      }),
    ]);

    dynamicRoutes = [
      ...venueIds.map((v) => ({
        url: `${siteUrl}/venues/${v.id}`,
        lastModified: v.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...comedianSlugs.map((c) => ({
        url: `${siteUrl}/comedians/${c.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...eventIds.map((e) => ({
        url: `${siteUrl}/events/${e.id}`,
        lastModified: e.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    // DB not configured (e.g. build without DATABASE_URL)
  }

  return [...staticRoutes, ...dynamicRoutes];
}
