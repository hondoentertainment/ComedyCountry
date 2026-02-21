/**
 * Bulk import venues and events from a JSON file.
 * Run: npm run db:import -- data/sample-import.json
 *
 * JSON format:
 * {
 *   "venues": [{ "name", "address", "city", "state", "latitude", "longitude", "capacity", "website", "type", "photos?", "socialLinks?" }],
 *   "events": [{ "venue": { "name", "city", "state" }, "date", "showtime?", "ticketUrl?", "priceMin?", "priceMax?", "showType?", "title?", "comedians": [{ "slug", "role?" }] }]
 * }
 *
 * - Venues are upserted by (name, city, state). Comedians must exist (by slug) for events.
 * - Import venues before events in the same file; events reference venues by name+city+state.
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { resolve } from "path";
import { runBulkImport, type ImportPayload } from "../src/lib/import";

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error("Usage: npm run db:import -- <path-to-json>");
    console.error("Example: npm run db:import -- data/sample-import.json");
    process.exit(1);
  }

  const filePath = resolve(process.cwd(), fileArg);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch (err) {
    console.error(`Failed to read ${filePath}:`, err);
    process.exit(1);
  }

  const payload: ImportPayload = {
    venues: Array.isArray((raw as { venues?: unknown }).venues)
      ? (raw as { venues: ImportPayload["venues"] }).venues
      : [],
    events: Array.isArray((raw as { events?: unknown }).events)
      ? (raw as { events: ImportPayload["events"] }).events
      : [],
  };

  if (payload.venues?.length === 0 && payload.events?.length === 0) {
    console.error("No venues or events in payload.");
    process.exit(1);
  }

  console.log(`Importing from ${filePath}...`);
  console.log(
    `  Venues: ${payload.venues?.length ?? 0}, Events: ${payload.events?.length ?? 0}`
  );

  const result = await runBulkImport(payload);

  console.log("\nResults:");
  console.log(`  Venues: ${result.venues.created} created, ${result.venues.updated} updated`);
  console.log(`  Events: ${result.events.created} created, ${result.events.updated} updated`);

  if (result.venues.errors.length > 0) {
    console.error("\nVenue errors:");
    result.venues.errors.forEach((e) => console.error(`  - ${e}`));
  }
  if (result.events.errors.length > 0) {
    console.error("\nEvent errors:");
    result.events.errors.forEach((e) => console.error(`  - ${e}`));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("../src/lib/prisma");
    await prisma.$disconnect();
  });
