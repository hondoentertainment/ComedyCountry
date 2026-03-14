import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

/**
 * Content moderation: report/flag inappropriate reviews or content.
 *
 * POST - Submit a report
 * GET  - List reports (admin only)
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Rate limit: 5 reports per hour
  const rlKey = getRateLimitKey(request);
  const rl = checkRateLimit(`report:${rlKey}`, { limit: 5, windowSeconds: 3600 });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many reports. Please try again later." }, { status: 429 });
  }

  const body = await request.json();
  const { entityType, entityId, reason, details } = body;

  const validTypes = ["event_review", "venue_review", "special_rating", "user", "comedy_list"];
  if (!entityType || !validTypes.includes(entityType) || !entityId || !reason) {
    return NextResponse.json(
      { error: "entityType, entityId, and reason are required" },
      { status: 400 }
    );
  }

  const validReasons = ["spam", "harassment", "inappropriate", "misinformation", "other"];
  if (!validReasons.includes(reason)) {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  }

  try {
    // Store report as an analytics event with special type
    await prisma.analyticsEvent.create({
      data: {
        entityType: `report:${entityType}`,
        entityId,
        action: "content_report",
        userId: session.user.id,
        metadata: JSON.stringify({
          reason,
          details: details?.slice(0, 500) || null,
          status: "pending",
          reportedAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({ reported: true });
  } catch {
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Admin only
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const rawStatus = searchParams.get("status") || "pending";
  const VALID_STATUSES = ["pending", "reviewed", "resolved", "dismissed", "all"] as const;
  const status = VALID_STATUSES.includes(rawStatus as typeof VALID_STATUSES[number]) ? rawStatus : "pending";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

  try {
    const reports = await prisma.analyticsEvent.findMany({
      where: {
        action: "content_report",
        ...(status !== "all"
          ? { metadata: { contains: `"status":"${status}"` } }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const parsed = reports.map((r) => ({
      id: r.id,
      entityType: r.entityType.replace("report:", ""),
      entityId: r.entityId,
      reporterId: r.userId,
      createdAt: r.createdAt,
      ...JSON.parse(r.metadata || "{}"),
    }));

    return NextResponse.json({ reports: parsed });
  } catch {
    return NextResponse.json({ reports: [] });
  }
}

/**
 * PATCH - Update report status (admin only)
 */
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { reportId, status, action } = await request.json();
  if (!reportId || !status) {
    return NextResponse.json({ error: "reportId and status required" }, { status: 400 });
  }

  const validStatuses = ["reviewed", "resolved", "dismissed"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const report = await prisma.analyticsEvent.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const meta = JSON.parse(report.metadata || "{}");
    meta.status = status;
    meta.reviewedBy = session.user.id;
    meta.reviewedAt = new Date().toISOString();
    if (action) meta.actionTaken = action;

    await prisma.analyticsEvent.update({
      where: { id: reportId },
      data: { metadata: JSON.stringify(meta) },
    });

    return NextResponse.json({ updated: true });
  } catch {
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}
