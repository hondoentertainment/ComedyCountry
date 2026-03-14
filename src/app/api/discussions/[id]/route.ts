import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getThread, addReply } from "@/lib/community";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const thread = await getThread(id);
    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    return NextResponse.json(thread);
  } catch {
    return NextResponse.json(
      { error: "Failed to load thread" },
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

  let body: { body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.body?.trim()) {
    return NextResponse.json(
      { error: "Reply body is required" },
      { status: 400 },
    );
  }

  try {
    const thread = await prisma.discussionThread.findUnique({
      where: { id },
    });
    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    if (thread.isLocked) {
      return NextResponse.json(
        { error: "Thread is locked" },
        { status: 403 },
      );
    }

    const reply = await addReply(id, session.user.id, body.body.trim());
    return NextResponse.json(reply, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to add reply" },
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
    const thread = await prisma.discussionThread.findUnique({
      where: { id },
    });
    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    if (thread.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Not authorized to delete this thread" },
        { status: 403 },
      );
    }

    await prisma.discussionThread.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete thread" },
      { status: 500 },
    );
  }
}
