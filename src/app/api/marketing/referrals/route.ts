import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateReferralCode, getReferralStats } from "@/lib/marketing";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const stats = await getReferralStats(session.user.id);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("GET /api/marketing/referrals error:", error);
    return NextResponse.json({ error: "Failed to fetch referral stats" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { eventId, venueId, discountType, discountValue, maxUses, expiresAt } = body;

    const code = await generateReferralCode(session.user.id, {
      eventId,
      venueId,
      discountType,
      discountValue,
      maxUses,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    return NextResponse.json(code, { status: 201 });
  } catch (error) {
    console.error("POST /api/marketing/referrals error:", error);
    return NextResponse.json({ error: "Failed to create referral code" }, { status: 500 });
  }
}
