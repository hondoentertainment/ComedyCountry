import { NextResponse } from "next/server";
import { getAccessibilityStats } from "@/lib/accessibility";

export async function GET() {
  try {
    const stats = await getAccessibilityStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error("GET /api/accessibility/stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch accessibility stats" },
      { status: 500 },
    );
  }
}
