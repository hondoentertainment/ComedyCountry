import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { eventId, name } = body;

  if (!eventId) {
    return NextResponse.json({ error: "Event is required" }, { status: 400 });
  }

  // Generate unique code
  let code = generateCode();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await prisma.showGroup.findUnique({ where: { code } });
    if (!existing) break;
    code = generateCode();
    attempts++;
  }

  const group = await prisma.showGroup.create({
    data: {
      eventId,
      creatorId: session.user.id,
      name: name?.trim() || null,
      code,
      members: {
        create: { userId: session.user.id, status: "going" },
      },
    },
    include: {
      members: { include: { user: { select: { profileName: true, name: true, image: true } } } },
    },
  });

  return NextResponse.json(group, { status: 201 });
}
