import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createFanClub } from "@/lib/community";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mine = searchParams.get("mine") === "true";

  try {
    if (mine) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "Not authenticated" },
          { status: 401 },
        );
      }

      const clubs = await prisma.fanClub.findMany({
        where: { members: { some: { userId: session.user.id } } },
        include: { _count: { select: { members: true } } },
        orderBy: { updatedAt: "desc" },
      });
      return NextResponse.json({ clubs });
    }

    const clubs = await prisma.fanClub.findMany({
      where: { isPublic: true },
      include: { _count: { select: { members: true } } },
      orderBy: { members: { _count: "desc" } },
      take: 50,
    });
    return NextResponse.json({ clubs });
  } catch {
    return NextResponse.json(
      { error: "Failed to load fan clubs" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { name?: string; description?: string; isPublic?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json(
      { error: "Club name is required" },
      { status: 400 },
    );
  }

  try {
    const club = await createFanClub(
      session.user.id,
      body.name.trim(),
      body.description?.trim(),
      body.isPublic,
    );
    return NextResponse.json(club, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create fan club" },
      { status: 500 },
    );
  }
}
