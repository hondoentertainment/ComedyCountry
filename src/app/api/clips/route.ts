import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClipFeed, createClip } from "@/lib/short-clips";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tags = searchParams.get("tags");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));
  const sort = (searchParams.get("sort") ?? "engagement") as "engagement" | "recent" | "views";

  try {
    const data = await getClipFeed({
      tags: tags ? tags.split(",").map((t) => t.trim()) : undefined,
      page,
      pageSize,
      sort,
    });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to load clip feed" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: {
    comedianId?: string;
    title?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    duration?: number;
    description?: string;
    tags?: string[];
    isPreview?: boolean;
    eventId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.videoUrl?.trim()) {
    return NextResponse.json({ error: "videoUrl is required" }, { status: 400 });
  }
  if (!body.duration || body.duration <= 0) {
    return NextResponse.json({ error: "duration is required and must be positive" }, { status: 400 });
  }

  try {
    const clip = await createClip({
      ...body,
      videoUrl: body.videoUrl.trim(),
      duration: body.duration,
      userId: session.user.id,
    });
    return NextResponse.json(clip, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create clip";
    if (message.includes("duration")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
