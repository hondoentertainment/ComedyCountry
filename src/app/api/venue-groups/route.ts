import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createVenueGroup } from "@/lib/marketplace";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const groups = await prisma.venueGroup.findMany({
      where: {
        OR: [
          { ownerId: session.user.id },
          { staff: { some: { userId: session.user.id } } },
        ],
      },
      include: { venues: true, staff: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("GET /api/venue-groups error:", error);
    return NextResponse.json({ error: "Failed to fetch venue groups" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const group = await createVenueGroup(session.user.id, name);
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error("POST /api/venue-groups error:", error);
    return NextResponse.json({ error: "Failed to create venue group" }, { status: 500 });
  }
}
