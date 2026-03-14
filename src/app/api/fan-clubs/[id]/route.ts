import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { joinFanClub } from "@/lib/community";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const club = await prisma.fanClub.findUnique({
      where: { id },
      include: {
        members: {
          orderBy: { createdAt: "asc" },
          take: 50,
        },
        _count: { select: { members: true } },
      },
    });

    if (!club) {
      return NextResponse.json(
        { error: "Fan club not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(club);
  } catch {
    return NextResponse.json(
      { error: "Failed to load fan club" },
      { status: 500 },
    );
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const member = await joinFanClub(session.user.id, id);
    return NextResponse.json(member, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to join fan club";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const club = await prisma.fanClub.findUnique({
      where: { id },
      include: {
        members: { where: { userId: session.user.id } },
      },
    });

    if (!club) {
      return NextResponse.json(
        { error: "Fan club not found" },
        { status: 404 },
      );
    }

    // If the user is the creator, delete the entire club
    if (club.creatorId === session.user.id) {
      await prisma.fanClub.delete({ where: { id } });
      return NextResponse.json({ success: true, action: "deleted" });
    }

    // Otherwise, leave the club
    if (club.members.length === 0) {
      return NextResponse.json(
        { error: "You are not a member of this club" },
        { status: 400 },
      );
    }

    await prisma.fanClubMember.delete({
      where: { clubId_userId: { clubId: id, userId: session.user.id } },
    });
    return NextResponse.json({ success: true, action: "left" });
  } catch {
    return NextResponse.json(
      { error: "Failed to leave/delete fan club" },
      { status: 500 },
    );
  }
}
