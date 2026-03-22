import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateWalletPass, getUserPasses } from "@/lib/wallet-passes";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`wallet-passes:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const passes = await getUserPasses(session.user.id);

    return NextResponse.json({ passes });
  } catch (error) {
    console.error("GET /api/wallet/passes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch wallet passes" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit(`wallet-passes:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { ticketId, platform } = body;

    if (!ticketId || typeof ticketId !== "string") {
      return NextResponse.json(
        { error: "ticketId is required" },
        { status: 400 },
      );
    }

    if (!platform || !["apple", "google"].includes(platform)) {
      return NextResponse.json(
        { error: "platform must be 'apple' or 'google'" },
        { status: 400 },
      );
    }

    const pass = await generateWalletPass(session.user.id, ticketId, platform);

    return NextResponse.json(pass, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Ticket not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("POST /api/wallet/passes error:", error);
    return NextResponse.json(
      { error: "Failed to generate wallet pass" },
      { status: 500 },
    );
  }
}
