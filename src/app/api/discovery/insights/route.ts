import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDiscoveryInsights } from "@/lib/discovery-engine";

/**
 * GET - Get "why we recommend this" explanations.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const insights = await getDiscoveryInsights(session.user.id);

    return NextResponse.json({ insights });
  } catch (err) {
    console.error("Discovery insights GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch discovery insights" },
      { status: 500 },
    );
  }
}
