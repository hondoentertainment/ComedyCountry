import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActiveChallenges, createChallenge } from "@/lib/short-clips";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`clips-challenges:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const challenges = await getActiveChallenges();
    return NextResponse.json(challenges);
  } catch {
    return NextResponse.json(
      { error: "Failed to load challenges" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(`clips-challenges:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: {
    title?: string;
    description?: string;
    promptText?: string;
    startDate?: string;
    endDate?: string;
    prize?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.title?.trim() || !body.description?.trim() || !body.promptText?.trim()) {
    return NextResponse.json(
      { error: "title, description, and promptText are required" },
      { status: 400 },
    );
  }
  if (!body.startDate || !body.endDate) {
    return NextResponse.json(
      { error: "startDate and endDate are required" },
      { status: 400 },
    );
  }

  try {
    const challenge = await createChallenge({
      title: body.title.trim(),
      description: body.description.trim(),
      promptText: body.promptText.trim(),
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      prize: body.prize,
    });
    return NextResponse.json(challenge, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create challenge";
    if (message.includes("End date")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
