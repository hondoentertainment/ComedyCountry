import { NextResponse } from "next/server";
import { requireCreator } from "@/lib/admin";
import { generateRouteBuilderReport } from "@/lib/route-builder";

export async function GET() {
  const auth = await requireCreator();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status });
  }

  try {
    const report = await generateRouteBuilderReport(auth.comedian.id);
    return NextResponse.json(report);
  } catch (error) {
    console.error("Route builder GET error:", error);
    return NextResponse.json({ error: "Failed to generate route builder report" }, { status: 500 });
  }
}
