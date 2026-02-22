/**
 * Import comedians from data/jester-comedians.json into the database.
 * Creates new comedians; skips those that already exist (by slug).
 *
 * Run: npx tsx scripts/import-jester-comedians.ts
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const INPUT_PATH = path.join(process.cwd(), "data", "jester-comedians.json");

type JesterComedian = {
  name: string;
  slug: string;
  headshotUrl?: string;
  profileUrl?: string;
  source?: string;
};

async function main() {
  const raw = fs.readFileSync(INPUT_PATH, "utf-8");
  const data = JSON.parse(raw) as { comedians?: JesterComedian[] };

  if (!data.comedians || !Array.isArray(data.comedians)) {
    console.error("Expected { comedians: [...] } in", INPUT_PATH);
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const EXCLUDED_SLUGS = new Set(["comedian-dashboard", "search-all"]);
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const c of data.comedians) {
    if (EXCLUDED_SLUGS.has(c.slug?.toLowerCase() ?? "")) {
      skipped++;
      continue;
    }
    if (!c.name || !c.slug) {
      console.warn("Skipping entry with missing name or slug:", c);
      skipped++;
      continue;
    }

    const slug = c.slug.trim().toLowerCase().replace(/\s+/g, "-");
    if (!slug) {
      skipped++;
      continue;
    }

    try {
      const existing = await prisma.comedian.findUnique({
        where: { slug },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.comedian.create({
        data: {
          name: c.name.trim(),
          slug,
          headshotUrl: c.headshotUrl?.trim() || null,
          touringStatus: "UNKNOWN",
        },
      });
      created++;
      if (created % 100 === 0) {
        console.log(`Created ${created} comedians...`);
      }
    } catch (err) {
      console.error(`Failed to create ${c.name} (${slug}):`, err);
      errors++;
    }
  }

  await prisma.$disconnect();
  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}, Errors: ${errors}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
