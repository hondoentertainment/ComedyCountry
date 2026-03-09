import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { comedianId, proofUrl, proofNote } = body;

  if (!comedianId) {
    return NextResponse.json({ error: "Comedian is required" }, { status: 400 });
  }

  try {
    // Check comedian exists
    const comedian = await prisma.comedian.findUnique({ where: { id: comedianId } });
    if (!comedian) {
      return NextResponse.json({ error: "Comedian not found" }, { status: 404 });
    }

    // Check for existing claim
    const existing = await prisma.comedianClaim.findUnique({
      where: { userId_comedianId: { userId: session.user.id, comedianId } },
    });
    if (existing) {
      return NextResponse.json({ error: "You already have a claim for this comedian", status: existing.status }, { status: 409 });
    }

    // Check if another user already has an approved claim
    const approvedClaim = await prisma.comedianClaim.findFirst({
      where: { comedianId, status: "APPROVED" },
    });
    if (approvedClaim) {
      return NextResponse.json({ error: "This comedian profile has already been claimed" }, { status: 409 });
    }

    const claim = await prisma.comedianClaim.create({
      data: {
        userId: session.user.id,
        comedianId,
        proofUrl: proofUrl || null,
        proofNote: proofNote || null,
      },
    });

    return NextResponse.json(claim, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Claim service unavailable" }, { status: 503 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const claims = await prisma.comedianClaim.findMany({
      where: { userId: session.user.id },
    });
    return NextResponse.json(claims);
  } catch {
    return NextResponse.json([]);
  }
}
