import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  const healthy = Object.values(checks).every((v) => v === "ok");

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
import { prisma } from "@/lib/prisma";
import { jsonResponse } from "@/lib/api";

export async function GET(request: Request) {
  let database = "up";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "down";
  }

  return jsonResponse(request, {
    ok: database === "up",
    service: "punchline-atlas",
    timestamp: new Date().toISOString(),
    checks: {
      database,
    },
  });
}
