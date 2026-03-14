import { NextResponse } from "next/server";
import { getSupportedLocales, getLocaleCompleteness } from "@/lib/international";

export async function GET() {
  try {
    const locales = await getSupportedLocales();

    const completeness = await Promise.all(
      locales.map((locale) => getLocaleCompleteness(locale)),
    );

    return NextResponse.json({ locales: completeness });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch locales" },
      { status: 500 },
    );
  }
}
