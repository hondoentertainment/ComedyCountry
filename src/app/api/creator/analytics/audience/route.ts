import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getComedianForUser } from "@/lib/creator";
import { getAudienceInsights } from "@/lib/creator-analytics";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const comedian = await getComedianForUser(session.user.id);
  if (!comedian) {
    return NextResponse.json({ error: "No approved comedian profile" }, { status: 403 });
  }

  try {
    const audience = await getAudienceInsights(comedian.id);
    return NextResponse.json(audience);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch audience insights";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
