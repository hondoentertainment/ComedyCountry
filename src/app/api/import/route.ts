import { NextResponse } from "next/server";
import { runBulkImport, type ImportPayload } from "@/lib/import";
import { applyRateLimit, getClientAddress, jsonError, jsonResponse, logError, logInfo } from "@/lib/api";

/**
 * POST /api/import
 * Bulk import/update venues and events from JSON.
 *
 * Body: { venues?: VenueImportItem[], events?: EventImportItem[] }
 *
 * Security: Set BULK_IMPORT_API_KEY to require "Authorization: Bearer <key>" or
 * "X-API-Key: <key>" header. If unset, endpoint is unprotected (dev only).
 */
export async function POST(request: Request) {
  const rateLimit = applyRateLimit(request, getClientAddress(request), {
    prefix: "bulk-import",
    limit: 5,
    windowMs: 60 * 1000,
  });
  if (rateLimit) return rateLimit;

  const apiKey = process.env.BULK_IMPORT_API_KEY;
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && !apiKey) {
    return jsonError(request, 503, "BULK_IMPORT_API_KEY required in production");
  }

  if (apiKey) {
    const authHeader = request.headers.get("authorization");
    const xApiKey = request.headers.get("x-api-key");
    const provided = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : xApiKey;
    if (provided !== apiKey) {
      return jsonError(request, 401, "Unauthorized");
    }
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
