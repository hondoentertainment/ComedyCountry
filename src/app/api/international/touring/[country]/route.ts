import { NextResponse } from "next/server";
import { getTouringInfo } from "@/lib/international";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ country: string }> },
) {
  try {
    const { country } = await params;
    const info = await getTouringInfo(decodeURIComponent(country));

    if (!info) {
      return NextResponse.json(
        { error: "Touring info not found for this country" },
        { status: 404 },
      );
    }

    return NextResponse.json(info);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch touring info" },
      { status: 500 },
    );
  }
}
