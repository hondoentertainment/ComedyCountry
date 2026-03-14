import { NextResponse } from "next/server";
import { getSceneIntelligenceBySlug } from "@/lib/scene-intelligence";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ city: string }> },
) {
  try {
    const { city } = await params;
    const insights = await getSceneIntelligenceBySlug(city);

    if (!insights) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    return NextResponse.json(insights, {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" },
    });
  } catch (error) {
    console.error("Scene insights GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch scene insights" },
      { status: 500 },
    );
  }
}
