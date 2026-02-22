import { NextRequest, NextResponse } from "next/server";
import { search } from "@/lib/search";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const take = Math.min(
    parseInt(request.nextUrl.searchParams.get("take") ?? "5", 10) || 5,
    20
  );

  try {
    const results = await search(q, take);
    return NextResponse.json(results);
  } catch {
    return NextResponse.json(
      { venues: [], comedians: [], events: [] },
      { status: 200 }
    );
  }
}
