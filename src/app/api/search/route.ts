import { NextRequest, NextResponse } from "next/server";
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
