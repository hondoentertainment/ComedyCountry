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
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.comedyListSave.findUnique({
    where: { userId_listId: { userId: session.user.id, listId: id } },
  });

  if (existing) {
    await prisma.comedyListSave.delete({ where: { id: existing.id } });
    return NextResponse.json({ saved: false });
  }

  await prisma.comedyListSave.create({
    data: { userId: session.user.id, listId: id },
  });
  return NextResponse.json({ saved: true });
}
