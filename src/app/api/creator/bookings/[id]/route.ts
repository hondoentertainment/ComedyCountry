import { NextResponse } from "next/server";
import { requireCreator } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { respondToBooking } from "@/lib/creator";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireCreator();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status });
  }

  try {
    const existing = await prisma.bookingRequest.findUnique({ where: { id: params.id } });
    if (!existing || existing.comedianId !== auth.comedian.id) {
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
