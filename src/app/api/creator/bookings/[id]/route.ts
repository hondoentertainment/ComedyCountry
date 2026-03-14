import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getComedianForUser, respondToBooking } from "@/lib/creator";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const comedian = await getComedianForUser(session.user.id);
  if (!comedian) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const existing = await prisma.bookingRequest.findUnique({ where: { id: params.id } });
    if (!existing || existing.comedianId !== comedian.id) {
      return NextResponse.json({ error: "Not found or not yours" }, { status: 404 });
    }

    const body = await request.json();
    const { status, responseNote } = body;

    if (!status || !["ACCEPTED", "DECLINED", "NEGOTIATING"].includes(status)) {
      return NextResponse.json(
        { error: "status must be ACCEPTED, DECLINED, or NEGOTIATING" },
        { status: 400 },
      );
    }

    const updated = await respondToBooking(params.id, status, responseNote);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to respond to booking" }, { status: 500 });
  }
}
