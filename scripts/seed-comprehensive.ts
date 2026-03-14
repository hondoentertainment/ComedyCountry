/**
 * Comprehensive seed script for Punchline Atlas
 * Seeds comedy venues across all US states and top comedians
 * Usage: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/seed-comprehensive.ts
 */

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

type VenueData = {
  name: string;
  address?: string;
  city: string;
  state: string;
  lat?: number;
  lng?: number;
  capacity?: number;
  type: string;
  website?: string;
};

type ComedianData = {
  name: string;
  slug: string;
  bio?: string;
  instagram?: string;
  touringStatus: string;
  yearsActiveFrom?: number;
  yearsActiveTo?: number;
  genres: string[];
  website?: string;
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function seedVenues() {
  const venueFile = path.join(__dirname, "../data/us-comedy-venues.json");
  const venues: VenueData[] = JSON.parse(fs.readFileSync(venueFile, "utf-8"));

  console.log(`Seeding ${venues.length} venues...`);
  let created = 0;
  let skipped = 0;

  for (const v of venues) {
    const slug = slugify(v.name + " " + v.city);
    try {
      await prisma.venue.upsert({
        where: { id: slug },
        update: {
          name: v.name,
          address: v.address || null,
          city: v.city,
          state: v.state,
          latitude: v.lat || null,
          longitude: v.lng || null,
          capacity: v.capacity || null,
          website: v.website || null,
          type: v.type as "CLUB" | "THEATER" | "BAR" | "FESTIVAL" | "OPEN_MIC",
        },
        create: {
          id: slug,
          name: v.name,
          address: v.address || null,
          city: v.city,
          state: v.state,
          latitude: v.lat || null,
          longitude: v.lng || null,
          capacity: v.capacity || null,
          website: v.website || null,
          type: v.type as "CLUB" | "THEATER" | "BAR" | "FESTIVAL" | "OPEN_MIC",
        },
      });
      created++;
    } catch (e) {
      skipped++;
    }
  }

  console.log(`Venues: ${created} created/updated, ${skipped} skipped`);
}

async function seedComedians() {
  const comedianFile = path.join(__dirname, "../data/top-comedians.json");
  const comedians: ComedianData[] = JSON.parse(fs.readFileSync(comedianFile, "utf-8"));

  // Also load the extended comedians list
  const extendedFile = path.join(__dirname, "../data/extended-comedians.json");
  let extendedComedians: ComedianData[] = [];
  if (fs.existsSync(extendedFile)) {
    extendedComedians = JSON.parse(fs.readFileSync(extendedFile, "utf-8"));
  }

  // Also load the expanded/enriched comedian data (from research agent)
  const expandedFile = path.join(__dirname, "../data/comedians-seed-expanded.json");
  let expandedComedians: ComedianData[] = [];
  if (fs.existsSync(expandedFile)) {
    const expandedData = JSON.parse(fs.readFileSync(expandedFile, "utf-8"));
    const entries = expandedData.comedians || expandedData;
    expandedComedians = (Array.isArray(entries) ? entries : []).map((c: Record<string, unknown>) => ({
      name: c.name as string,
      slug: (c.slug as string) || slugify(c.name as string),
      bio: (c.bio as string) || undefined,
      instagram: (c.instagram as string) || undefined,
      touringStatus: (c.touringStatus as string) || "UNKNOWN",
      genres: (c.genres as string[]) || [],
    }));
  }

  // Load alphabetical batch files (comedians-a-d.json, comedians-e-j.json, comedians-k-p.json, comedians-q-z.json)
  const batchFiles = ["comedians-a-d.json", "comedians-e-j.json", "comedians-k-p.json", "comedians-q-z.json"];
  let batchComedians: ComedianData[] = [];
  for (const batchFile of batchFiles) {
    const batchPath = path.join(__dirname, "../data", batchFile);
    if (fs.existsSync(batchPath)) {
      const batchData = JSON.parse(fs.readFileSync(batchPath, "utf-8"));
      const entries = Array.isArray(batchData) ? batchData : (batchData.comedians || []);
      batchComedians.push(
        ...entries.map((c: Record<string, unknown>) => ({
          name: c.name as string,
          slug: (c.slug as string) || slugify(c.name as string),
          bio: (c.bio as string) || undefined,
          instagram: (c.instagram as string) || undefined,
          touringStatus: (c.touringStatus as string) || "UNKNOWN",
          genres: (c.genres as string[]) || [],
        }))
      );
      console.log(`  Loaded ${entries.length} comedians from ${batchFile}`);
    }
  }

  const allComedians = [...comedians, ...extendedComedians, ...expandedComedians, ...batchComedians];

  // Deduplicate by slug
  const seen = new Set<string>();
  const unique = allComedians.filter((c) => {
    if (seen.has(c.slug)) return false;
    seen.add(c.slug);
    return true;
  });

  console.log(`Seeding ${unique.length} comedians...`);
  let created = 0;
  let skipped = 0;

  for (const c of unique) {
    try {
      const existing = await prisma.comedian.findUnique({ where: { slug: c.slug } });

      if (existing) {
        // Update
        await prisma.comedian.update({
          where: { slug: c.slug },
          data: {
            name: c.name,
            bio: c.bio || null,
            touringStatus: c.touringStatus as "TOURING" | "REGIONAL" | "LOCAL" | "RETIRED" | "UNKNOWN",
            website: c.website || null,
            yearsActiveFrom: c.yearsActiveFrom || null,
            yearsActiveTo: c.yearsActiveTo || null,
          },
        });
      } else {
        // Create with genres and social links
        await prisma.comedian.create({
          data: {
            name: c.name,
            slug: c.slug,
            bio: c.bio || null,
            touringStatus: c.touringStatus as "TOURING" | "REGIONAL" | "LOCAL" | "RETIRED" | "UNKNOWN",
            website: c.website || null,
            yearsActiveFrom: c.yearsActiveFrom || null,
            yearsActiveTo: c.yearsActiveTo || null,
            ...(c.genres.length > 0 && {
              genres: {
                create: c.genres.map((g) => ({ genre: g })),
              },
            }),
            ...(c.instagram && {
              socialLinks: {
                create: [
                  {
                    platform: "instagram",
                    url: `https://instagram.com/${c.instagram}`,
                  },
                ],
              },
            }),
          },
        });
      }
      created++;
    } catch (e) {
      skipped++;
    }
  }

  console.log(`Comedians: ${created} created/updated, ${skipped} skipped`);
}

async function seedEvents() {
  // Create sample events linking random comedians to venues
  const venues = await prisma.venue.findMany({ take: 50 });
  const comedians = await prisma.comedian.findMany({ take: 100 });

  if (venues.length === 0 || comedians.length === 0) {
    console.log("No venues or comedians to create events for");
    return;
  }

  console.log(`Creating sample events across ${venues.length} venues...`);
  let created = 0;

  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);

  for (let i = 0; i < Math.min(venues.length, 50); i++) {
    const venue = venues[i];
    // Create 2-5 events per venue
    const numEvents = 2 + Math.floor(Math.random() * 4);

    for (let j = 0; j < numEvents; j++) {
      const dayOffset = 1 + Math.floor(Math.random() * 60);
      const eventDate = new Date(baseDate);
      eventDate.setDate(eventDate.getDate() + dayOffset);
      eventDate.setHours(19 + Math.floor(Math.random() * 3), Math.random() > 0.5 ? 30 : 0, 0, 0);

      const comedian = comedians[Math.floor(Math.random() * comedians.length)];
      const eventId = `seed-event-${venue.id}-${j}`;
      const showtimes = ["7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM", "10:00 PM"];
      const showTypes = ["HEADLINE", "HEADLINE", "HEADLINE", "FEATURE", "OPEN_MIC"] as const;

      try {
        await prisma.event.upsert({
          where: { id: eventId },
          update: { date: eventDate },
          create: {
            id: eventId,
            venueId: venue.id,
            date: eventDate,
            showtime: showtimes[Math.floor(Math.random() * showtimes.length)],
            showType: showTypes[Math.floor(Math.random() * showTypes.length)],
            priceMin: 15 + Math.floor(Math.random() * 30),
            priceMax: 35 + Math.floor(Math.random() * 65),
            comedians: {
              create: {
                comedianId: comedian.id,
                role: "headline",
              },
            },
          },
        });
        created++;
      } catch {
        // Skip duplicates
      }
    }
  }

  console.log(`Events: ${created} created`);
}

async function main() {
  console.log("Starting comprehensive seed...\n");

  await seedVenues();
  await seedComedians();
  await seedEvents();

  console.log("\nComprehensive seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
