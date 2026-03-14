import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getComedianForUser } from "@/lib/creator";
import {
  createPodcastTicketLink,
  getPodcastConversionStats,
} from "@/lib/podcast-pipeline";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const comedianId = searchParams.get("comedianId");

  if (!comedianId) {
    return NextResponse.json({ error: "comedianId is required" }, { status: 400 });
  }

  try {
    const stats = await getPodcastConversionStats(comedianId);
    return NextResponse.json(stats);
  } catch {
    return NextResponse.json({ error: "Failed to fetch conversion stats" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const comedian = await getComedianForUser(session.user.id);
  if (!comedian) {
    return NextResponse.json({ error: "You must have an approved comedian profile" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { episodeId, eventId, clipId } = body;

    if (!episodeId || !eventId) {
      return NextResponse.json({ error: "episodeId and eventId are required" }, { status: 400 });
    }

    const link = await createPodcastTicketLink(episodeId, eventId, clipId);
    return NextResponse.json(link, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create ticket link" }, { status: 500 });
  }
}
