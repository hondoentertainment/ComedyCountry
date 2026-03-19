import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClip } from "@/lib/short-clips";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: {
    videoUrl?: string;
    thumbnailUrl?: string;
    title?: string;
    description?: string;
    duration?: number;
    tags?: string[];
    comedianId?: string;
    eventId?: string;
    isPreview?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.videoUrl?.trim()) {
    return NextResponse.json({ error: "videoUrl is required" }, { status: 400 });
  }

  if (!body.duration || body.duration <= 0) {
    return NextResponse.json(
      { error: "duration is required and must be a positive number" },
      { status: 400 },
    );
  }

  if (body.duration > 90) {
    return NextResponse.json(
      { error: "Clip duration cannot exceed 90 seconds" },
      { status: 400 },
    );
  }

  if (body.title && body.title.length > 200) {
    return NextResponse.json(
      { error: "Title must be 200 characters or less" },
      { status: 400 },
    );
  }

  if (body.description && body.description.length > 2000) {
    return NextResponse.json(
      { error: "Description must be 2000 characters or less" },
      { status: 400 },
    );
  }

  if (body.tags && body.tags.length > 10) {
    return NextResponse.json(
      { error: "Maximum 10 tags allowed" },
      { status: 400 },
    );
  }

  try {
    const clip = await createClip({
      videoUrl: body.videoUrl.trim(),
      thumbnailUrl: body.thumbnailUrl?.trim(),
      title: body.title?.trim(),
      description: body.description?.trim(),
      duration: body.duration,
      tags: body.tags?.map((t) => t.trim().toLowerCase()) ?? [],
      comedianId: body.comedianId,
      eventId: body.eventId,
      isPreview: body.isPreview ?? false,
      userId: session.user.id,
    });

    return NextResponse.json(
      {
        id: clip.id,
        videoUrl: clip.videoUrl,
        thumbnailUrl: clip.thumbnailUrl,
        title: clip.title,
        duration: clip.duration,
        status: clip.status,
        createdAt: clip.createdAt,
      },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to upload clip";
    if (message.includes("duration")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
