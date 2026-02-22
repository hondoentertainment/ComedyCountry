import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Delete user - Prisma cascade will remove Account, Session, ComedianFollow, VenueFollow
  await prisma.user.delete({
    where: { id: userId },
  });

  return NextResponse.json({ ok: true });
}
