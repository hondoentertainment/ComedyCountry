import { NextResponse } from "next/server";
import { runBulkImport, type ImportPayload } from "@/lib/import";
import { applyRateLimit, getClientAddress, jsonError, jsonResponse, logError, logInfo } from "@/lib/api";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * POST /api/import
 * Bulk import/update venues and events from JSON.
 *
 * Body: { venues?: VenueImportItem[], events?: EventImportItem[] }
 *
 * Security: Requires BULK_IMPORT_API_KEY env var. Provide key via
 * "Authorization: Bearer <key>" or "X-API-Key: <key>" header.
 */
export async function POST(request: Request) {
  const rl = await checkRateLimit(`import:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const rateLimit = applyRateLimit(request, getClientAddress(request), {
    prefix: "bulk-import",
    limit: 5,
    windowMs: 60 * 1000,
  });
  if (rateLimit) return rateLimit;

  const apiKey = process.env.BULK_IMPORT_API_KEY;
  const authHeader = request.headers.get("authorization");
  const xApiKey = request.headers.get("x-api-key");
  const provided = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : xApiKey;
  if (!apiKey || provided !== apiKey) {
    return jsonError(request, 403, "Invalid or missing API key");
  }

  let payload: ImportPayload;
  try {
    const body = await request.json();
    payload = {
      venues: body.venues ?? [],
      events: body.events ?? [],
    };
  } catch {
    return jsonError(request, 400, "Invalid JSON body");
  }

  if ((!payload.venues || payload.venues.length === 0) &&
      (!payload.events || payload.events.length === 0)) {
    return jsonError(request, 400, "No venues or events to import");
  }

  try {
    const venueCount = payload.venues?.length ?? 0;
    const eventCount = payload.events?.length ?? 0;
    logInfo(request, "Starting bulk import", {
      venues: venueCount,
      events: eventCount,
    });
    const result = await runBulkImport(payload);
    return jsonResponse(request, result);
  } catch (err) {
    logError(request, "Bulk import failed", err);
    return jsonError(request, 500, (err as Error).message);
  }
}
