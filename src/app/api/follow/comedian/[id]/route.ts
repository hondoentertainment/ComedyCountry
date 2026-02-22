import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: comedianId } = await params;
  if (!comedianId) {
    return NextResponse.json({ error: "Missing comedian ID" }, { status: 400 });
  }

  const comedian = await prisma.comedian.findUnique({
    where: { id: comedianId },
  });
  if (!comedian) {
    return NextResponse.json({ error: "Comedian not found" }, { status: 404 });
  }

  const existing = await prisma.comedianFollow.findUnique({
    where: {
      userId_comedianId: { userId: session.user.id, comedianId },
    },
  });

  if (existing) {
    await prisma.comedianFollow.delete({
      where: { id: existing.id },
    });
    return NextResponse.json({ following: false });
  }

  await prisma.comedianFollow.create({
    data: {
      userId: session.user.id,
      comedianId,
    },
  });
  return NextResponse.json({ following: true });
}
