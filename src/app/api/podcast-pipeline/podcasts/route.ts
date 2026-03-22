import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getComedianForUser } from "@/lib/creator";
import { registerPodcast, getPodcastsForComedian } from "@/lib/podcast-pipeline";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`podcast-pipeline-podcasts:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const comedianId = searchParams.get("comedianId");

  if (!comedianId) {
    return NextResponse.json({ error: "comedianId is required" }, { status: 400 });
  }

  try {
    const podcasts = await getPodcastsForComedian(comedianId);
    return NextResponse.json(podcasts);
  } catch {
    return NextResponse.json({ error: "Failed to fetch podcasts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(`podcast-pipeline-podcasts:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
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
    const { title, feedUrl, platform, subscriberCount } = body;

    if (!title || !feedUrl || !platform) {
      return NextResponse.json({ error: "title, feedUrl, and platform are required" }, { status: 400 });
    }

    const podcast = await registerPodcast(comedian.id, {
      title,
      feedUrl,
      platform,
      subscriberCount,
    });

    return NextResponse.json(podcast, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to register podcast" }, { status: 500 });
  }
}
