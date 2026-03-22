import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const rl = await checkRateLimit(`groups:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { code } = await params;
  const group = await prisma.showGroup.findUnique({
    where: { code },
    include: {
      creator: { select: { profileName: true, name: true, image: true } },
      members: {
        include: { user: { select: { id: true, profileName: true, name: true, image: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // Get event details
  const event = await prisma.event.findUnique({
    where: { id: group.eventId },
    include: {
      venue: { select: { name: true, city: true, state: true } },
      comedians: { include: { comedian: { select: { name: true, slug: true } } } },
    },
  });

  return NextResponse.json({ group, event });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const rl = await checkRateLimit(`groups:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { code } = await params;
  const body = await request.json();
  const status = body.status || "going";

  const group = await prisma.showGroup.findUnique({ where: { code } });
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const member = await prisma.showGroupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId: session.user.id } },
    update: { status },
    create: { groupId: group.id, userId: session.user.id, status },
  });

  return NextResponse.json(member);
}
