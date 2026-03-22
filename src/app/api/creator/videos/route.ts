import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getComedianForUser } from "@/lib/creator";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// GET /api/creator/videos — list videos for a comedian
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const rl = await checkRateLimit(`creator-videos:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const comedianId = searchParams.get("comedianId");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const take = Math.min(Math.max(1, parseInt(searchParams.get("take") ?? "20", 10)), 100);
  const mediaType = searchParams.get("mediaType") ?? undefined; // "video", "embed", etc.

  if (!comedianId) {
    return NextResponse.json({ error: "comedianId is required" }, { status: 400 });
  }

  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;

    // Check if requester owns this comedian profile
    let isOwner = false;
    if (userId) {
      const comedian = await getComedianForUser(userId);
      isOwner = comedian?.id === comedianId;
    }

    const where: Record<string, unknown> = {
      comedianId,
      mediaType: mediaType ?? { in: ["video", "embed"] },
    };

    // Non-owners can only see non-gated content
    if (!isOwner) {
      where.isGated = false;
    }

    const skip = (page - 1) * take;

    const [videos, total] = await Promise.all([
      prisma.exclusiveContent.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        take,
        skip,
        select: {
          id: true,
          title: true,
          body: true,
          mediaUrl: true,
          mediaType: true,
          embedUrl: true,
          isGated: true,
          publishedAt: true,
          comedian: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      prisma.exclusiveContent.count({ where }),
    ]);

    // Strip media URLs from gated content for non-owners
    const result = videos.map((v) => {
      if (!isOwner && v.isGated) {
        return { ...v, mediaUrl: null, embedUrl: null, body: null };
      }
      return v;
    });

    return NextResponse.json({
      videos: result,
      total,
      page,
      pages: Math.ceil(total / take),
    });
  } catch (error) {
    console.error("GET /api/creator/videos error:", error);
    return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/creator/videos — upload/create a new video entry
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const rl = await checkRateLimit(`creator-videos:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const comedian = await getComedianForUser(session.user.id);
  if (!comedian) {
    return NextResponse.json(
      { error: "You must have an approved comedian profile" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { title, description, mediaUrl, embedUrl, isGated } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    if (!mediaUrl && !embedUrl) {
      return NextResponse.json(
        { error: "Either mediaUrl or embedUrl is required" },
        { status: 400 },
      );
    }

    // Determine media type from the URLs
    let mediaType = "video";
    if (embedUrl) {
      mediaType = "embed";
    }

    const video = await prisma.exclusiveContent.create({
      data: {
        comedianId: comedian.id,
        title,
        body: description ?? null,
        mediaUrl: mediaUrl ?? null,
        mediaType,
        embedUrl: embedUrl ?? null,
        isGated: !!isGated,
      },
    });

    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    console.error("POST /api/creator/videos error:", error);
    return NextResponse.json({ error: "Failed to create video" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/creator/videos — delete a video
// ---------------------------------------------------------------------------

export async function DELETE(request: Request) {
  const rl = await checkRateLimit(`creator-videos:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const comedian = await getComedianForUser(session.user.id);
  if (!comedian) {
    return NextResponse.json(
      { error: "You must have an approved comedian profile" },
      { status: 403 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("id");

    if (!videoId) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.exclusiveContent.findFirst({
      where: { id: videoId, comedianId: comedian.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    await prisma.exclusiveContent.delete({ where: { id: videoId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/creator/videos error:", error);
    return NextResponse.json({ error: "Failed to delete video" }, { status: 500 });
  }
}
