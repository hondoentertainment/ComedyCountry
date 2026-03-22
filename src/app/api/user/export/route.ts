import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildUserExport } from "@/lib/user-export";
import { applyRateLimit, jsonError, jsonResponse, logError } from "@/lib/api";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`user-export:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  const rateLimit = applyRateLimit(
    request,
    session?.user?.id ?? "anonymous",
    {
      prefix: "user-export",
      limit: 10,
      windowMs: 60 * 60 * 1000,
    }
  );
  if (rateLimit) return rateLimit;

  if (!session?.user?.id) {
    return jsonError(request, 401, "Unauthorized");
  }

  let exportData;
  try {
    exportData = await buildUserExport(session.user.id);
  } catch (error) {
    logError(request, "User export failed", error, { userId: session.user.id });
    return jsonError(request, 500, "Failed to export user data");
  }

  if (!exportData) {
    return jsonError(request, 404, "User not found");
  }

  return jsonResponse(request, exportData);
}
