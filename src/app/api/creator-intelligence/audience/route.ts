import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getComedianForUser } from "@/lib/creator";
import { getUnifiedAudience, syncAudiencePlatform } from "@/lib/creator-intelligence";

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
    const data = await getUnifiedAudience(comedian.id);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch audience" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const comedian = await getComedianForUser(session.user.id);
  if (!comedian) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { platform, platformUserId, email, followerCount, engagementRate } = body;

    if (!platform) {
      return NextResponse.json({ error: "platform is required" }, { status: 400 });
    }

    const record = await syncAudiencePlatform(comedian.id, platform, {
      platformUserId,
      email,
      followerCount,
      engagementRate,
    });

    return NextResponse.json(record, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to sync audience" }, { status: 500 });
  }
}
