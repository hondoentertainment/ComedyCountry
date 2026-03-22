import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDiscussions, createThread } from "@/lib/community";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`discussions:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  if (!entityType || !entityId) {
    return NextResponse.json(
      { error: "entityType and entityId are required" },
      { status: 400 },
    );
  }

  try {
    const data = await getDiscussions(entityType, entityId, page);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to load discussions" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(`discussions:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { entityType?: string; entityId?: string; title?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { entityType, entityId, title, body: threadBody } = body;

  if (!entityType || !entityId || !title?.trim() || !threadBody?.trim()) {
    return NextResponse.json(
      { error: "entityType, entityId, title, and body are required" },
      { status: 400 },
    );
  }

  try {
    const thread = await createThread(
      session.user.id,
      entityType,
      entityId,
      title.trim(),
      threadBody.trim(),
    );
    return NextResponse.json(thread, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create thread" },
      { status: 500 },
    );
  }
}
