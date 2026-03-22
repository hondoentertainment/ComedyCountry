import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getComedianForUser, getSetlist, addSetlistEntry } from "@/lib/creator";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`creator-setlist:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const comedian = await getComedianForUser(session.user.id);
  if (!comedian) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);

  try {
    const entries = await getSetlist(comedian.id, limit);
    return NextResponse.json(entries);
  } catch {
    return NextResponse.json({ error: "Failed to fetch setlist" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(`creator-setlist:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

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
    const { bitName, eventId, durationMin, notes, crowdRating } = body;

    if (!bitName || typeof bitName !== "string") {
      return NextResponse.json({ error: "bitName is required" }, { status: 400 });
    }

    const entry = await addSetlistEntry(comedian.id, {
      bitName,
      eventId,
      durationMin: durationMin ? Number(durationMin) : undefined,
      notes,
      crowdRating: crowdRating ? Number(crowdRating) : undefined,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to add setlist entry" }, { status: 500 });
  }
}
