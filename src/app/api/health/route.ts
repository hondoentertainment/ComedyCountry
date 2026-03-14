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
