import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDuets, createDuet } from "@/lib/short-clips";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(`clips-duets:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { id } = await params;

  try {
    const duets = await getDuets(id);
    return NextResponse.json(duets);
  } catch {
    return NextResponse.json(
      { error: "Failed to load duets" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(`clips-duets:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  let body: {
    comedianId?: string;
    title?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    duration?: number;
    description?: string;
    tags?: string[];
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
    const duet = await createDuet(id, {
      ...body,
      videoUrl: body.videoUrl.trim(),
      duration: body.duration,
      userId: session.user.id,
    });
    return NextResponse.json(duet, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create duet";
    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message.includes("duration")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
