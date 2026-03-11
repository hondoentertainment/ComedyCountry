import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { applyToListing } from "@/lib/marketplace";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { listingId, comedianId, message, askingFee } = body;

    if (!listingId || !comedianId) {
      return NextResponse.json(
        { error: "listingId and comedianId are required" },
        { status: 400 }
      );
    }

    const application = await applyToListing(
      listingId,
      comedianId,
      session.user.id,
      message,
      askingFee
    );

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    console.error("POST /api/marketplace/applications error:", error);
    return NextResponse.json({ error: "Failed to submit application" }, { status: 500 });
  }
}
