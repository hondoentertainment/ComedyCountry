import { NextResponse } from "next/server";
import { getChallengeClips } from "@/lib/short-clips";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const clips = await getChallengeClips(id);
    return NextResponse.json(clips);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load challenge clips";
    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
