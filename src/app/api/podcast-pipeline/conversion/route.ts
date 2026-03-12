import { NextResponse } from "next/server";
import { getListenerToAttendeeConversion } from "@/lib/podcast-pipeline";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const comedianId = searchParams.get("comedianId");

  if (!comedianId) {
    return NextResponse.json({ error: "comedianId is required" }, { status: 400 });
  }

  try {
    const stats = await getListenerToAttendeeConversion(comedianId);
    return NextResponse.json(stats);
  } catch {
    return NextResponse.json({ error: "Failed to fetch conversion data" }, { status: 500 });
  }
}
