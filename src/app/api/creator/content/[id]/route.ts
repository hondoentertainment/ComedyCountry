import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getComedianForUser } from "@/lib/creator";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const item = await prisma.exclusiveContent.findUnique({
      where: { id: params.id },
    });
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check gating
    if (item.isGated) {
      const session = await getServerSession(authOptions);
      const userId = session?.user?.id;
      if (userId) {
        const owns = await prisma.comedianClaim.findFirst({
          where: { userId, comedianId: item.comedianId, status: "APPROVED" },
        });
        if (owns) return NextResponse.json(item);
      }
      // Strip gated content
      return NextResponse.json({
        ...item,
        body: null,
        mediaUrl: null,
        embedUrl: null,
      });
    }

    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Failed to fetch content" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const comedian = await getComedianForUser(session.user.id);
  if (!comedian) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const existing = await prisma.exclusiveContent.findUnique({ where: { id: params.id } });
    if (!existing || existing.comedianId !== comedian.id) {
      return NextResponse.json({ error: "Not found or not yours" }, { status: 404 });
    }

    const body = await request.json();
    const updated = await prisma.exclusiveContent.update({
      where: { id: params.id },
      data: {
        title: body.title ?? existing.title,
        body: body.body !== undefined ? body.body : existing.body,
        mediaUrl: body.mediaUrl !== undefined ? body.mediaUrl : existing.mediaUrl,
        mediaType: body.mediaType !== undefined ? body.mediaType : existing.mediaType,
        embedUrl: body.embedUrl !== undefined ? body.embedUrl : existing.embedUrl,
        isGated: body.isGated !== undefined ? body.isGated : existing.isGated,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update content" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const comedian = await getComedianForUser(session.user.id);
  if (!comedian) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const existing = await prisma.exclusiveContent.findUnique({ where: { id: params.id } });
    if (!existing || existing.comedianId !== comedian.id) {
      return NextResponse.json({ error: "Not found or not yours" }, { status: 404 });
    }

    await prisma.exclusiveContent.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete content" }, { status: 500 });
  }
}
