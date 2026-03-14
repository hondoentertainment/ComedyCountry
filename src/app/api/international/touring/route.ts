import { NextResponse } from "next/server";
import { getAllTouringInfo, createTouringInfo } from "@/lib/international";

export async function GET() {
  try {
    const info = await getAllTouringInfo();
    return NextResponse.json({ touringInfo: info });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch touring info" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { country, countryCode } = body;

    if (!country || !countryCode) {
      return NextResponse.json(
        { error: "country and countryCode are required" },
        { status: 400 },
      );
    }

    const info = await createTouringInfo(body);
    return NextResponse.json(info, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create touring info" },
      { status: 500 },
    );
  }
}
