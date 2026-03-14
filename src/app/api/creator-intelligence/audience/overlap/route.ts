import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getComedianForUser } from "@/lib/creator";
import { getAudienceOverlap } from "@/lib/creator-intelligence";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const comedian = await getComedianForUser(session.user.id);
  if (!comedian) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await getAudienceOverlap(comedian.id);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch audience overlap" }, { status: 500 });
  }
}
