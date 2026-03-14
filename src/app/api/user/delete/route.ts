import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyRateLimit, jsonError, jsonResponse, logError } from "@/lib/api";

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  const rateLimit = applyRateLimit(
    request,
    session?.user?.id ?? "anonymous",
    {
      prefix: "user-delete",
      limit: 3,
      windowMs: 60 * 60 * 1000,
    }
  );
  if (rateLimit) return rateLimit;

  if (!session?.user?.id) {
    return jsonError(request, 401, "Unauthorized");
  }

  const userId = session.user.id;

  // Delete user - Prisma cascade will remove Account, Session, ComedianFollow, VenueFollow
  try {
    await prisma.user.delete({
      where: { id: userId },
    });
  } catch (error) {
    logError(request, "User deletion failed", error, { userId });
    return jsonError(request, 500, "Failed to delete account");
  }

  return jsonResponse(request, { ok: true });
}
