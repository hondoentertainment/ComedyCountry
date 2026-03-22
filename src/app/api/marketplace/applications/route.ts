import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { applyToListing } from "@/lib/marketplace";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rl = await checkRateLimit(`marketplace-applications:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

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
