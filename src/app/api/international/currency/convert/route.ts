import { NextResponse } from "next/server";
import { convertCurrency } from "@/lib/international";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const amount = parseFloat(searchParams.get("amount") || "0");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        { error: "from and to currency codes are required" },
        { status: 400 },
      );
    }

    if (isNaN(amount) || amount < 0) {
      return NextResponse.json(
        { error: "amount must be a valid positive number" },
        { status: 400 },
      );
    }

    const result = await convertCurrency(amount, from, to);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Conversion failed" },
      { status: 500 },
    );
  }
}
