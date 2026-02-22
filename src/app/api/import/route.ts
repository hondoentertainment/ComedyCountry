import { NextResponse } from "next/server";
import { runBulkImport, type ImportPayload } from "@/lib/import";

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
  const apiKey = process.env.BULK_IMPORT_API_KEY;
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && !apiKey) {
    return NextResponse.json(
      { error: "BULK_IMPORT_API_KEY required in production" },
      { status: 503 }
    );
  }

  if (apiKey) {
    const authHeader = request.headers.get("authorization");
    const xApiKey = request.headers.get("x-api-key");
    const provided = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : xApiKey;
    if (provided !== apiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if ((!payload.venues || payload.venues.length === 0) &&
      (!payload.events || payload.events.length === 0)) {
    return NextResponse.json(
      { error: "No venues or events to import" },
      { status: 400 }
    );
  }

  try {
    const result = await runBulkImport(payload);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[import] Bulk import failed:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
