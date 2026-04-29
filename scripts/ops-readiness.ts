import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { getOpsReadinessSnapshot } from "../src/lib/ops-readiness";

function pad(value: string, width: number) {
  if (value.length >= width) return value;
  return `${value}${" ".repeat(width - value.length)}`;
}

function truncate(value: string, width: number) {
  if (value.length <= width) return value;
  return `${value.slice(0, width - 1)}...`;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

async function main() {
  const snapshot = await getOpsReadinessSnapshot();

  console.log("\nTrusted Comedy Graph Ops Readiness");
  console.log("==================================");
  console.log(`Generated: ${formatDate(snapshot.generatedAt)}`);
  console.log(`Target-city venues: ${snapshot.totals.targetCityVenues}`);
  console.log(`Upcoming target-city events: ${snapshot.totals.targetCityUpcomingEvents}`);
  console.log(`Average coverage: ${Math.round(snapshot.totals.averageCoverage)}`);
  console.log(`Open stale queue: ${snapshot.totals.staleQueueSize}`);

  console.log("\nImport guardrails");
  console.log("-----------------");
  console.log(`Bulk import API key: ${snapshot.importGuardrails.bulkImportApiKeyConfigured ? "configured" : "missing"}`);
  console.log(`Strict target cities: ${snapshot.importGuardrails.strictTargetCities ? "enabled" : "disabled"}`);
  console.log(`Max venues per run: ${snapshot.importGuardrails.maxVenues}`);
  console.log(`Max events per run: ${snapshot.importGuardrails.maxEvents}`);

  console.log("\nFive-city coverage");
  console.log("------------------");
  console.log(`${pad("City", 12)}${pad("Coverage", 12)}${pad("Venues", 10)}${pad("Shows", 10)}${pad("Accessible", 13)}Fair`);
  for (const city of snapshot.freshness.cities) {
    console.log(
      `${pad(city.city.shortLabel, 12)}${pad(String(Math.round(city.coverageScore)), 12)}${pad(String(city.venueCount), 10)}${pad(String(city.upcomingEventCount), 10)}${pad(String(city.accessibleEventCount), 13)}${city.fairEventCount}`,
    );
  }

  console.log("\nEvent gaps");
  console.log("----------");
  if (snapshot.eventGaps.length === 0) {
    console.log("No urgent upcoming event gaps.");
  } else {
    for (const event of snapshot.eventGaps) {
      console.log(`- ${truncate(event.title, 48)} | ${event.venueName} | ${formatDate(event.date)}`);
      console.log(`  ${event.issues.join("; ")}`);
    }
  }

  console.log("\nVenue gaps");
  console.log("----------");
  if (snapshot.venueGaps.length === 0) {
    console.log("No urgent venue metadata gaps.");
  } else {
    for (const venue of snapshot.venueGaps) {
      console.log(`- ${truncate(venue.name, 48)} | ${venue.city}, ${venue.state}`);
      console.log(`  ${venue.issues.join("; ")}`);
    }
  }

  console.log("\nRecent imports");
  console.log("--------------");
  if (snapshot.recentImports.length === 0) {
    console.log("No import history recorded yet.");
  } else {
    for (const run of snapshot.recentImports) {
      console.log(
        `- ${formatDate(run.createdAt)} | ${run.action === "import_preview" ? "dry-run" : "write"} | ${run.source} | requested ${run.venuesRequested} venues / ${run.eventsRequested} events | errors ${run.venueErrors + run.eventErrors}`,
      );
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
