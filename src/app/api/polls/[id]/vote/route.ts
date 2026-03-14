import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { votePoll } from "@/lib/community";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  let body: { optionIndex?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.optionIndex !== "number") {
    return NextResponse.json(
      { error: "optionIndex is required" },
      { status: 400 },
    );
  }

  try {
    const vote = await votePoll(id, session.user.id, body.optionIndex);
    return NextResponse.json(vote);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to vote";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
