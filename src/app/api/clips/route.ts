import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getClips, uploadClip } from "@/lib/community";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const comedianId = searchParams.get("comedianId");
  const venueId = searchParams.get("venueId");
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  let entityType: string | undefined;
  let entityId: string | undefined;

  if (comedianId) {
    entityType = "comedian";
    entityId = comedianId;
  } else if (venueId) {
    entityType = "venue";
    entityId = venueId;
  }

  try {
    const data = await getClips(
      entityType,
      entityId,
      status ?? undefined,
      page,
    );
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to load clips" },
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
    eventId?: string;
    comedianId?: string;
    venueId?: string;
    videoUrl?: string;
    caption?: string;
    durationSec?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.videoUrl?.trim()) {
    return NextResponse.json(
      { error: "videoUrl is required" },
      { status: 400 },
    );
  }

  try {
    const clip = await uploadClip(session.user.id, {
      eventId: body.eventId,
      comedianId: body.comedianId,
      venueId: body.venueId,
      videoUrl: body.videoUrl.trim(),
      caption: body.caption,
      durationSec: body.durationSec,
    });
    return NextResponse.json(clip, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to upload clip" },
      { status: 500 },
    );
  }
}
