import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getVenueCRMData, updateCRMRecord } from "@/lib/marketplace";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

    if (!venueId) {
      return NextResponse.json({ error: "venueId is required" }, { status: 400 });
    }

    const result = await getVenueCRMData(venueId, page);
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/venue-crm error:", error);
    return NextResponse.json({ error: "Failed to fetch CRM data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { venueId, userId, tags, notes } = body;

    if (!venueId || !userId) {
      return NextResponse.json(
        { error: "venueId and userId are required" },
        { status: 400 }
      );
    }

    const record = await updateCRMRecord(venueId, userId, { tags, notes });
    return NextResponse.json(record);
  } catch (error) {
    console.error("POST /api/venue-crm error:", error);
    return NextResponse.json({ error: "Failed to update CRM record" }, { status: 500 });
  }
}
