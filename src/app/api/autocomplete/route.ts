import { NextRequest, NextResponse } from "next/server";
import { autocomplete, type AutocompleteType } from "@/lib/search";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

const VALID_TYPES = new Set<AutocompleteType>(["venue", "comedian", "event"]);

export async function GET(request: NextRequest) {
  const rl = checkRateLimit(getRateLimitKey(request), { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const q = request.nextUrl.searchParams.get("q") ?? "";
  const type = request.nextUrl.searchParams.get("type") as AutocompleteType | null;
  const take = Math.min(
    parseInt(request.nextUrl.searchParams.get("take") ?? "6", 10) || 6,
    20,
  );

  if (!type || !VALID_TYPES.has(type)) {
    return NextResponse.json(
      { error: "type must be 'venue', 'comedian', or 'event'" },
      { status: 400 },
    );
  }

  try {
    const results = await autocomplete(q, type, take);
    return NextResponse.json(results);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
