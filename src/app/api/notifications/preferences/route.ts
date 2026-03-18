import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let prefs = await prisma.notificationPreference.findUnique({
    where: { userId: session.user.id },
  });

  if (!prefs) {
    prefs = await prisma.notificationPreference.create({
      data: { userId: session.user.id },
    });
  }

  return NextResponse.json(prefs);
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { inApp, emailDigest, eventReminder24h, eventReminder1h } = body;

  const data: { inApp?: boolean; emailDigest?: string; eventReminder24h?: boolean; eventReminder1h?: boolean } = {};
  if (typeof inApp === "boolean") data.inApp = inApp;
  if (emailDigest && ["off", "daily", "weekly"].includes(emailDigest)) {
    data.emailDigest = emailDigest;
  }
  if (typeof eventReminder24h === "boolean") data.eventReminder24h = eventReminder24h;
  if (typeof eventReminder1h === "boolean") data.eventReminder1h = eventReminder1h;

  const prefs = await prisma.notificationPreference.upsert({
    where: { userId: session.user.id },
    update: data,
    create: { userId: session.user.id, ...data },
  });

  return NextResponse.json(prefs);
}
