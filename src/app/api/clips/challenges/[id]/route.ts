import { NextResponse } from "next/server";
import { getChallengeClips } from "@/lib/short-clips";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await checkRateLimit(`clips-challenges:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

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
