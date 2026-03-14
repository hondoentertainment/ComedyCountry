import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createSMSCampaign,
  scheduleSMSCampaign,
  getSMSCampaignStats,
} from "@/lib/marketing";

/* ─── GET - Fetch all campaigns (SMS + email) for a venue ─────────────── */

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");
    const type = searchParams.get("type"); // "sms", "email", or null for all
    const status = searchParams.get("status"); // filter by status
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)),
    );

    if (!venueId) {
      return NextResponse.json(
        { error: "venueId is required" },
        { status: 400 },
      );
    }

    const skip = (page - 1) * pageSize;

    // Fetch SMS campaigns
    let smsCampaigns: Array<{
      id: string;
      name: string;
      message: string;
      status: string;
      recipientCount: number;
      deliveredCount: number;
      clickCount: number;
      optOutCount: number;
      scheduledAt: Date | null;
      sentAt: Date | null;
      createdAt: Date;
      segmentId: string | null;
      channel: string;
    }> = [];

    let emailCampaigns: Array<{
      id: string;
      subject: string;
      status: string;
      sentCount: number;
      openCount: number;
      clickCount: number;
      scheduledAt: Date | null;
      sentAt: Date | null;
      createdAt: Date;
      segment: string | null;
      channel: string;
    }> = [];

    if (!type || type === "sms") {
      const smsWhere: Record<string, unknown> = { venueId };
      if (status) smsWhere.status = status;

      const smsRaw = await prisma.sMSCampaign.findMany({
        where: smsWhere,
        orderBy: { createdAt: "desc" },
        skip: type === "sms" ? skip : 0,
        take: type === "sms" ? pageSize : 100,
      });

      smsCampaigns = smsRaw.map((c) => ({
        id: c.id,
        name: c.name,
        message: c.message,
        status: c.status,
        recipientCount: c.recipientCount,
        deliveredCount: c.deliveredCount,
        clickCount: c.clickCount,
        optOutCount: c.optOutCount,
        scheduledAt: c.scheduledAt,
        sentAt: c.sentAt,
        createdAt: c.createdAt,
        segmentId: c.segmentId,
        channel: "sms",
      }));
    }

    if (!type || type === "email") {
      const emailWhere: Record<string, unknown> = { venueId };
      if (status) emailWhere.status = status;

      try {
        const emailRaw = await prisma.emailCampaign.findMany({
          where: emailWhere,
          orderBy: { createdAt: "desc" },
          skip: type === "email" ? skip : 0,
          take: type === "email" ? pageSize : 100,
        });

        emailCampaigns = emailRaw.map((c) => ({
          id: c.id,
          subject: c.subject,
          status: c.status,
          sentCount: c.sentCount,
          openCount: c.openCount,
          clickCount: c.clickCount,
          scheduledAt: c.scheduledAt,
          sentAt: c.sentAt,
          createdAt: c.createdAt,
          segment: c.segment ?? null,
          channel: "email",
        }));
      } catch {
        // emailCampaign model may not exist yet; skip gracefully
      }
    }

    // Merge and sort by creation date
    const allCampaigns = [
      ...smsCampaigns.map((c) => ({
        ...c,
        channel: "sms" as const,
        content: c.message,
      })),
      ...emailCampaigns.map((c) => ({
        ...c,
        channel: "email" as const,
        content: c.subject,
      })),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // Paginate unified list if not filtering by type
    const paginated =
      !type
        ? allCampaigns.slice(skip, skip + pageSize)
        : allCampaigns;

    return NextResponse.json({
      campaigns: paginated,
      total: allCampaigns.length,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("GET /api/marketing/campaigns error:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 },
    );
  }
}

/* ─── POST - Create a new campaign ────────────────────────────────────── */

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let body: {
      venueId?: string;
      channel?: "sms" | "email";
      name?: string;
      message?: string;
      subject?: string;
      htmlBody?: string;
      segmentId?: string;
      scheduledAt?: string;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { venueId, channel = "sms", name, segmentId } = body;

    if (!venueId) {
      return NextResponse.json(
        { error: "venueId is required" },
        { status: 400 },
      );
    }
    if (!name?.trim()) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 },
      );
    }

    if (channel === "sms") {
      const { message } = body;
      if (!message?.trim()) {
        return NextResponse.json(
          { error: "message is required for SMS campaigns" },
          { status: 400 },
        );
      }

      const campaign = await createSMSCampaign(venueId, {
        name: name.trim(),
        message: message.trim(),
        segmentId,
      });

      // Optionally schedule
      if (body.scheduledAt) {
        const scheduledDate = new Date(body.scheduledAt);
        if (isNaN(scheduledDate.getTime())) {
          return NextResponse.json(
            { error: "Invalid scheduledAt date" },
            { status: 400 },
          );
        }
        try {
          const scheduled = await scheduleSMSCampaign(
            campaign.id,
            scheduledDate,
          );
          return NextResponse.json(
            { ...scheduled, channel: "sms" },
            { status: 201 },
          );
        } catch (err) {
          // Return created campaign even if scheduling fails
          const msg =
            err instanceof Error ? err.message : "Failed to schedule";
          return NextResponse.json(
            { ...campaign, channel: "sms", schedulingError: msg },
            { status: 201 },
          );
        }
      }

      return NextResponse.json(
        { ...campaign, channel: "sms" },
        { status: 201 },
      );
    }

    if (channel === "email") {
      const { subject, htmlBody } = body;
      if (!subject?.trim()) {
        return NextResponse.json(
          { error: "subject is required for email campaigns" },
          { status: 400 },
        );
      }

      try {
        const campaign = await prisma.emailCampaign.create({
          data: {
            venueId,
            subject: subject.trim(),
            body: htmlBody ?? "",
            segment: segmentId ?? null,
            scheduledAt: body.scheduledAt
              ? new Date(body.scheduledAt)
              : null,
          },
        });

        return NextResponse.json(
          { ...campaign, channel: "email" },
          { status: 201 },
        );
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to create email campaign";
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    }

    return NextResponse.json(
      { error: "Invalid channel. Must be 'sms' or 'email'" },
      { status: 400 },
    );
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Failed to create campaign";
    const status = msg.includes("160 characters") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

/* ─── PATCH - Update campaign status (schedule, pause, etc.) ──────────── */

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let body: {
      campaignId?: string;
      channel?: "sms" | "email";
      action?: "schedule" | "pause" | "resume" | "stats";
      scheduledAt?: string;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { campaignId, channel = "sms", action } = body;

    if (!campaignId) {
      return NextResponse.json(
        { error: "campaignId is required" },
        { status: 400 },
      );
    }
    if (!action) {
      return NextResponse.json(
        { error: "action is required (schedule, pause, resume, stats)" },
        { status: 400 },
      );
    }

    if (channel === "sms") {
      switch (action) {
        case "schedule": {
          if (!body.scheduledAt) {
            return NextResponse.json(
              { error: "scheduledAt is required for scheduling" },
              { status: 400 },
            );
          }
          const scheduled = await scheduleSMSCampaign(
            campaignId,
            new Date(body.scheduledAt),
          );
          return NextResponse.json(scheduled);
        }

        case "stats": {
          const stats = await getSMSCampaignStats(campaignId);
          return NextResponse.json(stats);
        }

        case "pause": {
          const paused = await prisma.sMSCampaign.update({
            where: { id: campaignId },
            data: { status: "draft" },
          });
          return NextResponse.json(paused);
        }

        case "resume": {
          const resumed = await prisma.sMSCampaign.update({
            where: { id: campaignId },
            data: { status: "scheduled" },
          });
          return NextResponse.json(resumed);
        }

        default:
          return NextResponse.json(
            { error: `Unknown action: ${action}` },
            { status: 400 },
          );
      }
    }

    if (channel === "email") {
      switch (action) {
        case "schedule": {
          if (!body.scheduledAt) {
            return NextResponse.json(
              { error: "scheduledAt is required for scheduling" },
              { status: 400 },
            );
          }
          const scheduled = await prisma.emailCampaign.update({
            where: { id: campaignId },
            data: {
              scheduledAt: new Date(body.scheduledAt),
              status: "scheduled",
            },
          });
          return NextResponse.json(scheduled);
        }

        case "pause": {
          const paused = await prisma.emailCampaign.update({
            where: { id: campaignId },
            data: { status: "draft" },
          });
          return NextResponse.json(paused);
        }

        default:
          return NextResponse.json(
            { error: `Unknown action for email: ${action}` },
            { status: 400 },
          );
      }
    }

    return NextResponse.json(
      { error: "Invalid channel. Must be 'sms' or 'email'" },
      { status: 400 },
    );
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Failed to update campaign";
    const status =
      msg.includes("not found") || msg.includes("Only draft")
        ? 400
        : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
