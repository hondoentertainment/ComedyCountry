import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Enhanced uptime monitoring endpoint.
 * Returns detailed health status for external monitoring services.
 *
 * GET /api/monitoring/uptime
 *
 * Returns 200 if all systems healthy, 503 if any critical system is down.
 * Designed for UptimeRobot, Better Uptime, Pingdom, or similar services.
 */
export async function GET() {
  const checks: Record<
    string,
    { status: "ok" | "error"; latencyMs: number; error?: string }
  > = {};

  // Database connectivity check
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "ok", latencyMs: Date.now() - dbStart };
  } catch (err) {
    checks.database = {
      status: "error",
      latencyMs: Date.now() - dbStart,
      error: err instanceof Error ? err.message : "Database unreachable",
    };
  }

  // Check database can read core tables
  const tableStart = Date.now();
  try {
    await prisma.venue.count();
    checks.tables = { status: "ok", latencyMs: Date.now() - tableStart };
  } catch (err) {
    checks.tables = {
      status: "error",
      latencyMs: Date.now() - tableStart,
      error: err instanceof Error ? err.message : "Table read failed",
    };
  }

  const allHealthy = Object.values(checks).every((c) => c.status === "ok");

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev",
      checks,
    },
    {
      status: allHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
