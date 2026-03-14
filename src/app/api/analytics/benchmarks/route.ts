import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getVenueBenchmarks } from "@/lib/analytics-engine";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const venueId = searchParams.get("venueId");

  if (!venueId) {
    return NextResponse.json(
      { error: "venueId is required" },
      { status: 400 }
    );
  }

  try {
    const benchmarks = await getVenueBenchmarks(venueId);
    return NextResponse.json(benchmarks);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get benchmarks" },
      { status: 500 }
    );
  }
}
