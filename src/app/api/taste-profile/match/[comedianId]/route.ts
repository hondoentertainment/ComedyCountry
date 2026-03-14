import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTasteMatchScore, computeTasteProfile, getTasteProfile } from "@/lib/taste-profile";

/**
 * GET - Get taste match percentage for a comedian.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ comedianId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { comedianId } = await params;
    if (!comedianId) {
      return NextResponse.json({ error: "Missing comedian ID" }, { status: 400 });
    }

    // Ensure profile exists
    const existing = await getTasteProfile(session.user.id);
    if (!existing) {
      await computeTasteProfile(session.user.id);
    }

    const result = await getTasteMatchScore(session.user.id, comedianId);

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=600" },
    });
  } catch (err) {
    console.error("Taste match error:", err);
    return NextResponse.json(
      { error: "Failed to compute taste match" },
      { status: 500 }
    );
  }
}
