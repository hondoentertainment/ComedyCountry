import { NextResponse } from "next/server";
import { getComedyStyles, createComedyStyle } from "@/lib/international";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country") || undefined;

    const styles = await getComedyStyles(country);
    return NextResponse.json({ styles });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch styles" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, country, description } = body;

    if (!name || !country || !description) {
      return NextResponse.json(
        { error: "name, country, and description are required" },
        { status: 400 },
      );
    }

    const style = await createComedyStyle(body);
    return NextResponse.json(style, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create style" },
      { status: 500 },
    );
  }
}
