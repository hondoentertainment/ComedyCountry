import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const startedAt = new Date().toISOString();

/**
 * GET /api/health
 * Comprehensive health check with database connectivity verification.
 * No auth required. Used by load balancers, uptime monitors, and alerting.
 *
 * Query params:
 *   ?detail=true  — include dependency breakdown (database latency, uptime)
 */
export async function GET(request: Request) {
  const timestamp = new Date().toISOString();
  const url = new URL(request.url);
  const detail = url.searchParams.get("detail") === "true";

  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};
  let overallStatus: "ok" | "degraded" = "ok";

  // ─── Database check ─────────────────────────────────────────────────
  const dbStart = Date.now();
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database health check timed out")), 5000)
      ),
    ]);
    checks.database = { status: "connected", latencyMs: Date.now() - dbStart };
  } catch (err) {
    overallStatus = "degraded";
    const message = err instanceof Error ? err.message : "Unknown error";
    checks.database = { status: "disconnected", latencyMs: Date.now() - dbStart, error: message };
    logger.warn("Health check: database unreachable", { error: message });
  }

  const body: Record<string, unknown> = {
    status: overallStatus,
    timestamp,
  };

  if (detail) {
    body.checks = checks;
    body.version = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";
    body.uptime = startedAt;
    body.environment = process.env.NODE_ENV;
  }

  return NextResponse.json(body, { status: overallStatus === "ok" ? 200 : 503 });
}
