import { NextResponse } from "next/server";
import { getSupportedLocales, getLocaleCompleteness } from "@/lib/international";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`international-locales:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const locales = await getSupportedLocales();

    const completeness = await Promise.all(
      locales.map((locale: string) => getLocaleCompleteness(locale)),
    );

    return NextResponse.json({ locales: completeness });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch locales" },
      { status: 500 },
    );
  }
}
