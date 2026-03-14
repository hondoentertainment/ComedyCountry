import { NextRequest, NextResponse } from "next/server";
import { search, autocomplete } from "@/lib/search";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const rl = checkRateLimit(getRateLimitKey(request), { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const params = request.nextUrl.searchParams;
  const q = (params.get("q") ?? "").slice(0, 200);
  const mode = params.get("mode"); // "autocomplete" for typeahead
  const take = Math.min(parseInt(params.get("take") ?? "10", 10) || 10, 50);

  try {
    if (mode === "autocomplete") {
      const results = await autocomplete(q);
      return NextResponse.json(results);
    }

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
      { status: 200 }
    );
import { search } from "@/lib/search";
import { applyRateLimit, getClientAddress, jsonError, jsonResponse, logError } from "@/lib/api";

export async function GET(request: NextRequest) {
  const rateLimit = applyRateLimit(request, getClientAddress(request), {
    prefix: "search",
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (rateLimit) return rateLimit;

  const q = request.nextUrl.searchParams.get("q") ?? "";
  const take = Math.min(
    Math.max(1, parseInt(request.nextUrl.searchParams.get("take") ?? "5", 10) || 5),
    20
  );

  try {
    const results = await search(q, take);
    return jsonResponse(request, results);
  } catch (error) {
    logError(request, "Search request failed", error, { qLength: q.length, take });
    return jsonError(request, 500, "Search failed");
  }
}
