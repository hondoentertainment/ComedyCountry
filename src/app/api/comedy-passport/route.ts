import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getComedyPassportSummary } from "@/lib/comedy-passport";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const passport = await getComedyPassportSummary(session.user.id);
    return NextResponse.json(passport, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (error) {
    console.error("Comedy passport GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch comedy passport" },
      { status: 500 },
    );
  }
}
