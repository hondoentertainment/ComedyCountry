import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await checkRateLimit(`lists-save:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.comedyListSave.findUnique({
      where: { userId_listId: { userId: session.user.id, listId: id } },
    });

    if (existing) {
      await prisma.comedyListSave.delete({ where: { id: existing.id } });
      return NextResponse.json({ saved: false });
    }

    await prisma.comedyListSave.create({
      data: { userId: session.user.id, listId: id },
    });
    return NextResponse.json({ saved: true });
  } catch (err) {
    logger.requestError(request, "Failed to toggle list save", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
