import { NextResponse } from "next/server";
import { getFestivalById } from "@/lib/international";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const festival = await getFestivalById(id);

    if (!festival) {
      return NextResponse.json({ error: "Festival not found" }, { status: 404 });
    }

    return NextResponse.json(festival);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch festival" },
      { status: 500 },
    );
  }
}
