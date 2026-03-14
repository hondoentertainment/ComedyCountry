import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTalentListings, createTalentListing } from "@/lib/marketplace";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city") ?? undefined;
    const state = searchParams.get("state") ?? undefined;
    const genre = searchParams.get("genre") ?? undefined;
    const showType = searchParams.get("showType") ?? undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

    const result = await getTalentListings({ city, state, genre, showType, page });
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/marketplace/listings error:", error);
    return NextResponse.json({ error: "Failed to fetch listings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { venueId, date, showType, genre, budgetMin, budgetMax, description } = body;

    if (!venueId || !date || !showType) {
      return NextResponse.json(
        { error: "venueId, date, and showType are required" },
        { status: 400 }
      );
    }

    const listing = await createTalentListing(venueId, {
      date: new Date(date),
      showType,
      genre,
      budgetMin,
      budgetMax,
      description,
    });

    return NextResponse.json(listing, { status: 201 });
  } catch (error) {
    console.error("POST /api/marketplace/listings error:", error);
    return NextResponse.json({ error: "Failed to create listing" }, { status: 500 });
  }
}
