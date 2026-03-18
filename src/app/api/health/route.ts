import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Simple uptime check - returns 200 with status and timestamp.
 * No auth required. Used for monitoring and uptime checks.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
