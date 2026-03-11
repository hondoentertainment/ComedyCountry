import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { matchInfluencers } from "@/lib/marketing";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");

    if (!venueId) {
      return NextResponse.json({ error: "venueId is required" }, { status: 400 });
    }

    const platform = searchParams.get("platform") ?? undefined;
    const minFollowers = searchParams.get("minFollowers")
      ? Number(searchParams.get("minFollowers"))
      : undefined;
    const minEngagement = searchParams.get("minEngagement")
      ? Number(searchParams.get("minEngagement"))
      : undefined;
    const genres = searchParams.get("genres")
      ? searchParams.get("genres")!.split(",")
      : undefined;

    const influencers = await matchInfluencers(venueId, {
      platform,
      minFollowers,
      minEngagement,
      genres,
    });

    return NextResponse.json({ influencers });
  } catch (error) {
    console.error("GET /api/marketing/influencers error:", error);
    return NextResponse.json({ error: "Failed to fetch influencers" }, { status: 500 });
  }
}
