import { NextRequest, NextResponse } from "next/server";
import { search, autocomplete, unifiedSearch, parseFilters } from "@/lib/search";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const rl = await checkRateLimit(`search:${getRateLimitKey(request)}`, { limit: 30, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const params = request.nextUrl.searchParams;
  const mode = params.get("mode");
  const q = (params.get("q") ?? "").slice(0, 200);

  try {
    // Autocomplete mode for typeahead
    if (mode === "autocomplete") {
      const results = await autocomplete(q);
      return NextResponse.json(results);
    }

    // Unified search mode: returns typed, ranked, paginated results
    if (mode === "unified") {
      const filters = parseFilters(params);
      const response = await unifiedSearch(filters);
      return NextResponse.json(response, {
        headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
      });
    }

    // Legacy mode: backwards-compatible flat response
    const take = Math.min(parseInt(params.get("take") ?? "10", 10) || 10, 50);

    const filters = {
      city: params.get("city") ?? undefined,
      state: params.get("state") ?? undefined,
      genre: params.get("genre") ?? undefined,
      venueType: params.get("venueType") ?? undefined,
      showType: params.get("showType") ?? undefined,
      dateFrom: params.get("dateFrom") ?? undefined,
      dateTo: params.get("dateTo") ?? undefined,
      priceMin: params.get("priceMin") ? parseFloat(params.get("priceMin")!) : undefined,
      priceMax: params.get("priceMax") ? parseFloat(params.get("priceMax")!) : undefined,
    };

    const results = await search(q, take, filters);
    return NextResponse.json(results);
  } catch {
    return NextResponse.json(
      { venues: [], comedians: [], events: [], facets: {}, totalCounts: {}, query: q, suggestions: [] },
      { status: 200 },
    );
  }
}
