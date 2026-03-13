import { NextResponse } from "next/server";
import {
  discoverAccessibleShows,
  findASLShows,
  findCaptionedShows,
  findSensoryFriendlyEvents,
  rankVenuesByAccessibility,
  getAccessibilityFeatureCoverage,
} from "@/lib/accessibility-discovery";

/**
 * GET /api/accessible-shows
 *
 * Query params:
 * - type: "asl" | "captioned" | "sensory" | "all" (default: "all")
 * - city: filter by city
 * - state: filter by state
 * - dateFrom: ISO date string
 * - dateTo: ISO date string
 * - minScore: minimum accessibility score (0-100)
 * - wheelchair: "true" to require wheelchair access
 * - hearingLoop: "true" to require hearing loop
 * - audioDescribed: "true" to require audio description
 * - largePrint: "true" to require large print
 * - serviceAnimal: "true" to require service animal policy
 * - view: "venues" for venue rankings, "coverage" for stats
 * - take: number of results (default: 20)
 * - skip: offset for pagination
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";
    const view = searchParams.get("view");
    const city = searchParams.get("city") || undefined;
    const state = searchParams.get("state") || undefined;
    const dateFromStr = searchParams.get("dateFrom");
    const dateToStr = searchParams.get("dateTo");
    const minScoreStr = searchParams.get("minScore");
    const takeStr = searchParams.get("take");
    const skipStr = searchParams.get("skip");

    const dateFrom = dateFromStr ? new Date(dateFromStr) : undefined;
    const dateTo = dateToStr ? new Date(dateToStr) : undefined;
    const minScore = minScoreStr ? parseInt(minScoreStr, 10) : undefined;
    const take = takeStr ? parseInt(takeStr, 10) : 20;
    const skip = skipStr ? parseInt(skipStr, 10) : 0;

    // Venue rankings view
    if (view === "venues") {
      const result = await rankVenuesByAccessibility({ city, state, take, skip });
      return NextResponse.json(result);
    }

    // Coverage stats view
    if (view === "coverage") {
      const result = await getAccessibilityFeatureCoverage();
      return NextResponse.json(result);
    }

    // Specific feature-type shortcuts
    if (type === "asl") {
      const result = await findASLShows({ city, state, dateFrom, dateTo, take, skip });
      return NextResponse.json(result);
    }

    if (type === "captioned") {
      const result = await findCaptionedShows({ city, state, dateFrom, dateTo, take, skip });
      return NextResponse.json(result);
    }

    if (type === "sensory") {
      const result = await findSensoryFriendlyEvents({ city, state, dateFrom, dateTo, take, skip });
      return NextResponse.json(result);
    }

    // Advanced multi-filter discovery
    const result = await discoverAccessibleShows({
      aslInterpreted: searchParams.get("asl") === "true" || undefined,
      captioned: searchParams.get("captioned") === "true" || undefined,
      sensoryFriendly: searchParams.get("sensoryFriendly") === "true" || undefined,
      audioDescribed: searchParams.get("audioDescribed") === "true" || undefined,
      wheelchairAccessible: searchParams.get("wheelchair") === "true" || undefined,
      hearingLoop: searchParams.get("hearingLoop") === "true" || undefined,
      largePrint: searchParams.get("largePrint") === "true" || undefined,
      serviceAnimal: searchParams.get("serviceAnimal") === "true" || undefined,
      city,
      state,
      dateFrom,
      dateTo,
      minScore,
      take,
      skip,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/accessible-shows error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch accessible shows" },
      { status: 500 },
    );
  }
}
