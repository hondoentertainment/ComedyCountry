import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDiscoveryProfile, computeDiscoveryProfile } from "@/lib/discovery-engine";

/**
 * GET - Get user's discovery profile. Auto-computes if missing.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let profile = await getDiscoveryProfile(session.user.id);

    if (!profile) {
      profile = await computeDiscoveryProfile(session.user.id);
    }

    return NextResponse.json(profile);
  } catch (err) {
    console.error("Discovery profile GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch discovery profile" },
      { status: 500 },
    );
  }
}
