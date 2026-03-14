import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getComedianForUser } from "@/lib/creator";
import { getFinancialForecast } from "@/lib/creator-intelligence";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const comedian = await getComedianForUser(session.user.id);
  if (!comedian) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const months = Number(searchParams.get("months") ?? 3);

    const data = await getFinancialForecast(comedian.id, months);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to generate forecast" }, { status: 500 });
  }
}
