import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { joinWaitlistQueue, getWaitlistPosition } from "@/lib/fair-ticketing";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }

  try {
    const position = await getWaitlistPosition(eventId, session.user.id);
    if (!position) {
      return NextResponse.json({ error: "Not in waitlist" }, { status: 404 });
    }
    return NextResponse.json(position);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get position";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { eventId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { eventId } = body;
  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }

  try {
    const entry = await joinWaitlistQueue(eventId, session.user.id);
    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to join waitlist";
    const status = message === "Already in waitlist" ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
