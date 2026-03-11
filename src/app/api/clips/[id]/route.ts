import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { voteOnClip } from "@/lib/community";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const clip = await prisma.userClip.findUnique({
      where: { id },
      include: { votes: true },
    });
    if (!clip) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }
    return NextResponse.json(clip);
  } catch {
    return NextResponse.json(
      { error: "Failed to load clip" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  let body: { vote?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.vote !== 1 && body.vote !== -1) {
    return NextResponse.json(
      { error: "vote must be 1 or -1" },
      { status: 400 },
    );
  }

  try {
    const result = await voteOnClip(id, session.user.id, body.vote);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to vote on clip" },
      { status: 500 },
    );
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

    await prisma.userClip.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete clip" },
      { status: 500 },
    );
  }
}
