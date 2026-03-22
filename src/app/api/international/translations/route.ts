import { NextResponse } from "next/server";
import { getTranslations, setTranslation } from "@/lib/international";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rl = await checkRateLimit(`international-translations:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const ns = searchParams.get("ns");
    const locale = searchParams.get("locale");

    if (!ns || !locale) {
      return NextResponse.json(
        { error: "ns (namespace) and locale query params are required" },
        { status: 400 },
      );
    }

    const translations = await getTranslations(ns, locale);
    return NextResponse.json({ translations });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch translations" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const rl = await checkRateLimit(`international-translations:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { namespace, key, locale, value } = body;

    if (!namespace || !key || !locale || !value) {
      return NextResponse.json(
        { error: "namespace, key, locale, and value are required" },
        { status: 400 },
      );
    }

    const translation = await setTranslation(namespace, key, locale, value);
    return NextResponse.json(translation, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to set translation" },
      { status: 500 },
    );
  }
}
