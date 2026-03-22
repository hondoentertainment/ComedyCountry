import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(`clips:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { id } = await params;

  try {
    const clip = await prisma.userClip.findUnique({
      where: { id },
    });
    if (!clip) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }
    return NextResponse.json(clip);
  } catch {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(`clips:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const clip = await prisma.userClip.findUnique({ where: { id } });
    if (!clip) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }

    // Allow owner or admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (clip.userId !== session.user.id && user?.role !== "admin") {
      return NextResponse.json(
        { error: "Not authorized to delete this clip" },
        { status: 403 },
      );
    }

    await prisma.userClip.update({
      where: { id },
      data: { status: "DMCA_REMOVED" },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete clip" },
      { status: 500 },
    );
  }
}
