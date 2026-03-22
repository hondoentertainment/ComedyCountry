import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/health
 * Uptime check with database connectivity verification.
 * No auth required. Used for monitoring and uptime checks.
 */
export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    // Ping the database with a 5-second timeout
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database health check timed out")), 5000)
      ),
    ]);

    return NextResponse.json({
      status: "ok",
      timestamp,
      database: "connected",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        status: "degraded",
        timestamp,
        database: "disconnected",
        error: message,
      },
      { status: 503 }
    );
  }
}
