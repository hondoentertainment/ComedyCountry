import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAgentRoster } from "@/lib/marketplace";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const roster = await getAgentRoster(session.user.id);
    return NextResponse.json({ roster });
  } catch (error) {
    console.error("GET /api/agent-roster error:", error);
    return NextResponse.json({ error: "Failed to fetch roster" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { comedianId, commission } = body;

    if (!comedianId) {
      return NextResponse.json({ error: "comedianId is required" }, { status: 400 });
    }

    const entry = await prisma.agentRoster.create({
      data: {
        userId: session.user.id,
        comedianId,
        commission,
      },
      include: { comedian: true },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("POST /api/agent-roster error:", error);
    return NextResponse.json({ error: "Failed to add to roster" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const comedianId = searchParams.get("comedianId");

    if (!comedianId) {
      return NextResponse.json({ error: "comedianId is required" }, { status: 400 });
    }

    await prisma.agentRoster.delete({
      where: {
        userId_comedianId: { userId: session.user.id, comedianId },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/agent-roster error:", error);
    return NextResponse.json({ error: "Failed to remove from roster" }, { status: 500 });
  }
}
