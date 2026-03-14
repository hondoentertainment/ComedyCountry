import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redeemReferralCode } from "@/lib/marketing";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { code, orderId } = body;

    if (!code) {
      return NextResponse.json({ error: "code is required" }, { status: 400 });
    }

    const redemption = await redeemReferralCode(code, session.user.id, orderId);
    return NextResponse.json(redemption, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to redeem code";
    const status =
      msg.includes("not found") ||
      msg.includes("expired") ||
      msg.includes("inactive") ||
      msg.includes("maximum") ||
      msg.includes("own referral") ||
      msg.includes("already used")
        ? 400
        : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
