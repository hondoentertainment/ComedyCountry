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

function parseFlag(args: string[], flag: string) {
  return args.includes(flag);
}

function parseOption(args: string[], prefix: string) {
  const match = args.find((arg) => arg.startsWith(`${prefix}=`));
  return match ? match.slice(prefix.length + 1) : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const fileArg = args.find((arg) => !arg.startsWith("--"));
  if (!fileArg) {
    console.error("Usage: npm run db:import -- <path-to-json>");
    console.error("Example: npm run db:import -- data/sample-import.json --dry-run --strict-target-cities");
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
  const dryRun = parseFlag(args, "--dry-run");
  const strictTargetCities = parseFlag(args, "--strict-target-cities");
  const source = parseOption(args, "--source") ?? "cli";
  if (dryRun) {
    console.log("  Mode: dry run");
  }
  if (strictTargetCities) {
    console.log("  Guardrail: strict target cities enabled");
  }

  const result = await runBulkImport(payload, {
    dryRun,
    strictTargetCities,
    source,
  });

  console.log("\nResults:");
  console.log(`  Venues: ${result.venues.created} ${dryRun ? "would create" : "created"}, ${result.venues.updated} ${dryRun ? "would update" : "updated"}`);
  console.log(`  Events: ${result.events.created} ${dryRun ? "would create" : "created"}, ${result.events.updated} ${dryRun ? "would update" : "updated"}`);

  if (result.warnings.length > 0) {
    console.warn("\nWarnings:");
    result.warnings.forEach((warning) => console.warn(`  - [${warning.scope}] ${warning.message}`));
  }

  if (result.targetCityImpact.length > 0) {
    console.log("\nTarget-city impact:");
    result.targetCityImpact.forEach((impact) => {
      const coverage = impact.currentCoverageScore == null
        ? "n/a"
        : `${Math.round(impact.currentCoverageScore)}${impact.coverageDelta != null ? ` -> ${Math.round(impact.postImportCoverageScore ?? impact.currentCoverageScore)}` : ""}`;
      console.log(
        `  - ${impact.shortLabel}: ${impact.venueImports} venues, ${impact.eventImports} events, coverage ${coverage}`,
      );
    });
  }

  if (result.venues.errors.length > 0) {
    console.error("\nVenue errors:");
    result.venues.errors.forEach((e) => console.error(`  - ${e}`));
  }
  if (result.events.errors.length > 0) {
    console.error("\nEvent errors:");
    result.events.errors.forEach((e) => console.error(`  - ${e}`));
  }

  if (result.venues.errors.length > 0 || result.events.errors.length > 0) {
    process.exitCode = 1;
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
