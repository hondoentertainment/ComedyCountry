import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");

    if (!venueId) {
      return NextResponse.json({ error: "venueId is required" }, { status: 400 });
    }

    const campaigns = await prisma.emailCampaign.findMany({
      where: { venueId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("GET /api/email-campaigns error:", error);
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { venueId, subject, body: emailBody, segment, scheduledAt } = body;

    if (!venueId || !subject || !emailBody) {
      return NextResponse.json(
        { error: "venueId, subject, and body are required" },
        { status: 400 }
      );
    }

    const campaign = await prisma.emailCampaign.create({
      data: {
        venueId,
        subject,
        body: emailBody,
        segment,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        status: scheduledAt ? "scheduled" : "draft",
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("POST /api/email-campaigns error:", error);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
