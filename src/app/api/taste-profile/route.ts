import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { computeTasteProfile, getTasteProfile } from "@/lib/taste-profile";

const STALE_DAYS = 7;

/**
 * GET - Get current user's taste profile. Auto-computes if missing or stale (>7 days).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let profile = await getTasteProfile(session.user.id);

    // Recompute if missing or stale
    if (!profile || isStale(profile.lastComputed)) {
      profile = await computeTasteProfile(session.user.id);
    }

    return NextResponse.json(profile);
  } catch (err) {
    console.error("Taste profile GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch taste profile" },
      { status: 500 }
    );
  }
}

/**
 * POST - Force recompute the user's taste profile.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const profile = await computeTasteProfile(session.user.id);
    return NextResponse.json(profile);
  } catch (err) {
    console.error("Taste profile POST error:", err);
    return NextResponse.json(
      { error: "Failed to compute taste profile" },
      { status: 500 }
    );
  }
}

function isStale(lastComputed: Date): boolean {
  const age = Date.now() - lastComputed.getTime();
  return age > STALE_DAYS * 24 * 60 * 60 * 1000;
}
