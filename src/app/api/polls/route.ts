import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPoll } from "@/lib/community";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`polls:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");

  if (!entityType || !entityId) {
    return NextResponse.json(
      { error: "entityType and entityId are required" },
      { status: 400 },
    );
  }

  try {
    const polls = await prisma.poll.findMany({
      where: { entityType, entityId },
      include: { votes: true, _count: { select: { votes: true } } },
      orderBy: { createdAt: "desc" },
    });

    const mapped = polls.map((poll) => {
      const options: string[] = JSON.parse(poll.options);
      const tallies = options.map(
        (_, i) => poll.votes.filter((v) => v.optionIndex === i).length,
      );
      return {
        id: poll.id,
        entityType: poll.entityType,
        entityId: poll.entityId,
        userId: poll.userId,
        question: poll.question,
        options,
        tallies,
        totalVotes: poll._count.votes,
        expiresAt: poll.expiresAt,
        createdAt: poll.createdAt,
      };
    });

    return NextResponse.json({ polls: mapped });
  } catch {
    return NextResponse.json(
      { error: "Failed to load polls" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(`polls:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: {
    entityType?: string;
    entityId?: string;
    question?: string;
    options?: string[];
    expiresAt?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { entityType, entityId, question, options, expiresAt } = body;

  if (!entityType || !entityId || !question?.trim()) {
    return NextResponse.json(
      { error: "entityType, entityId, and question are required" },
      { status: 400 },
    );
  }

  if (!Array.isArray(options) || options.length < 2) {
    return NextResponse.json(
      { error: "At least 2 options are required" },
      { status: 400 },
    );
  }

  try {
    const poll = await createPoll(
      session.user.id,
      entityType,
      entityId,
      question.trim(),
      options.map((o) => o.trim()),
      expiresAt ? new Date(expiresAt) : undefined,
    );
    return NextResponse.json(poll, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create poll" },
      { status: 500 },
    );
  }
}
