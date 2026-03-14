import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: List user's season passes
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const passes = await prisma.seasonPass.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(passes);
  } catch {
    return NextResponse.json(
      { error: "Failed to load season passes" },
      { status: 500 }
    );
  }
}

// POST: Purchase a season pass
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    venueId?: string;
    name?: string;
    totalShows?: number;
    price?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { venueId, name, totalShows, price } = body;

  if (!venueId || !name || !totalShows || price == null) {
    return NextResponse.json(
      { error: "venueId, name, totalShows, and price are required" },
      { status: 400 }
    );
  }

  try {
    // Verify venue exists
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
    });

    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    // Default expiration: 1 year from now
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const pass = await prisma.seasonPass.create({
      data: {
        venueId,
        userId: session.user.id,
        name,
        totalShows,
        price,
        expiresAt,
      },
    });

    return NextResponse.json(pass, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to purchase season pass" },
      { status: 500 }
    );
  }
}
