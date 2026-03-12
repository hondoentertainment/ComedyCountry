import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAudienceDemographics } from "@/lib/analytics-engine";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const comedianId = searchParams.get("comedianId");

  if (!comedianId) {
    return NextResponse.json(
      { error: "comedianId is required" },
      { status: 400 }
    );
  }

  try {
    const demographics = await getAudienceDemographics(comedianId);
    return NextResponse.json(demographics);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get demographics" },
      { status: 500 }
    );
  }
}
