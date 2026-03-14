import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTicketsForUser } from "@/lib/tickets";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tickets = await getTicketsForUser(session.user.id);
    return NextResponse.json(tickets);
  } catch {
    return NextResponse.json(
      { error: "Failed to load tickets" },
      { status: 500 }
    );
  }
}
