import { NextResponse } from "next/server";
import { getTranslations, setTranslation } from "@/lib/international";

export async function GET(request: Request) {
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
