import { NextResponse } from "next/server";
import {
  getInternationalScenes,
  createInternationalScene,
} from "@/lib/international";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country") || undefined;
    const region = searchParams.get("region") || undefined;

    const scenes = await getInternationalScenes({ country, region });
    return NextResponse.json({ scenes });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch scenes" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { city, country, countryCode, timezone } = body;

    if (!city || !country || !countryCode || !timezone) {
      return NextResponse.json(
        { error: "city, country, countryCode, and timezone are required" },
        { status: 400 },
      );
    }

    const scene = await createInternationalScene(body);
    return NextResponse.json(scene, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create scene" },
      { status: 500 },
    );
  }
}
