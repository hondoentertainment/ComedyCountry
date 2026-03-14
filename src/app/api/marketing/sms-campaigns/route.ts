import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createSMSCampaign, getSMSCampaigns } from "@/lib/marketing";

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

    const campaigns = await getSMSCampaigns(venueId);
    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("GET /api/marketing/sms-campaigns error:", error);
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { venueId, name, message, segmentId } = body;

    if (!venueId || !name || !message) {
      return NextResponse.json(
        { error: "venueId, name, and message are required" },
        { status: 400 },
      );
    }

    const campaign = await createSMSCampaign(venueId, { name, message, segmentId });
    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create campaign";
    const status = msg.includes("160 characters") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
