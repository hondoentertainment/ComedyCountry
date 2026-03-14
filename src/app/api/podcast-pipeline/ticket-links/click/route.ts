import { NextResponse } from "next/server";
import { recordPodcastClick } from "@/lib/podcast-pipeline";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { linkId } = body;

    if (!linkId) {
      return NextResponse.json({ error: "linkId is required" }, { status: 400 });
    }

    const link = await recordPodcastClick(linkId);
    return NextResponse.json(link);
  } catch {
    return NextResponse.json({ error: "Failed to record click" }, { status: 500 });
  }
}
