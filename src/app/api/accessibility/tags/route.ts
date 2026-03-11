import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addAccessibilityTag, getAccessibilityTags } from "@/lib/accessibility";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const eventId = searchParams.get("eventId") ?? undefined;
    const venueId = searchParams.get("venueId") ?? undefined;

    const tags = await getAccessibilityTags(eventId, venueId);

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("GET /api/accessibility/tags error:", error);
    return NextResponse.json(
      { error: "Failed to fetch accessibility tags" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { eventId, venueId, type, description } = body;

    if (!type || typeof type !== "string") {
      return NextResponse.json(
        { error: "type is required" },
        { status: 400 },
      );
    }

    if (!eventId && !venueId) {
      return NextResponse.json(
        { error: "Either eventId or venueId is required" },
        { status: 400 },
      );
    }

    const tag = await addAccessibilityTag({
      eventId,
      venueId,
      type,
      description,
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Invalid accessibility type")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("POST /api/accessibility/tags error:", error);
    return NextResponse.json(
      { error: "Failed to create accessibility tag" },
      { status: 500 },
    );
  }
}
