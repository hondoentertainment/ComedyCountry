import { NextResponse } from "next/server";
import { suggestPodcastTicketLinks } from "@/lib/podcast-pipeline";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const comedianId = searchParams.get("comedianId");

  if (!comedianId) {
    return NextResponse.json({ error: "comedianId is required" }, { status: 400 });
  }

  try {
    const suggestions = await suggestPodcastTicketLinks(comedianId);
    return NextResponse.json(suggestions);
  } catch {
    return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
  }
}
