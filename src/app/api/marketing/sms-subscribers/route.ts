import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addSMSSubscriber, removeSMSSubscriber } from "@/lib/marketing";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { phone, venueId, source } = body;

    if (!phone || !venueId) {
      return NextResponse.json(
        { error: "phone and venueId are required" },
        { status: 400 },
      );
    }

    const subscriber = await addSMSSubscriber(phone, venueId, source);
    return NextResponse.json(subscriber, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to add subscriber";
    const status = msg.includes("Invalid phone") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { phone, venueId } = body;

    if (!phone || !venueId) {
      return NextResponse.json(
        { error: "phone and venueId are required" },
        { status: 400 },
      );
    }

    const subscriber = await removeSMSSubscriber(phone, venueId);
    return NextResponse.json(subscriber);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to remove subscriber";
    const status = msg.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
