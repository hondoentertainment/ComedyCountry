import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getVenueCheckIns, checkInToVenue } from "@/lib/community";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const venueId = searchParams.get("venueId");

  if (!venueId) {
    return NextResponse.json(
      { error: "venueId is required" },
      { status: 400 },
    );
  }

  try {
    const data = await getVenueCheckIns(venueId);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to load check-ins" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { venueId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.venueId) {
    return NextResponse.json(
      { error: "venueId is required" },
      { status: 400 },
    );
  }

  try {
    const checkIn = await checkInToVenue(session.user.id, body.venueId);
    return NextResponse.json(checkIn, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to check in";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
