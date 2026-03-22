import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getComedianForUser } from "@/lib/creator";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const rl = await checkRateLimit(`creator-merch:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const comedian = await getComedianForUser(session.user.id);
  if (!comedian) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const existing = await prisma.merchItem.findUnique({ where: { id: params.id } });
    if (!existing || existing.comedianId !== comedian.id) {
      return NextResponse.json({ error: "Not found or not yours" }, { status: 404 });
    }

    const body = await request.json();
    const updated = await prisma.merchItem.update({
      where: { id: params.id },
      data: {
        name: body.name ?? existing.name,
        description: body.description !== undefined ? body.description : existing.description,
        price: body.price ?? existing.price,
        imageUrl: body.imageUrl !== undefined ? body.imageUrl : existing.imageUrl,
        externalUrl: body.externalUrl !== undefined ? body.externalUrl : existing.externalUrl,
        inStock: body.inStock !== undefined ? body.inStock : existing.inStock,
        sortOrder: body.sortOrder ?? existing.sortOrder,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update merch item" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const rl = await checkRateLimit(`creator-merch:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const comedian = await getComedianForUser(session.user.id);
  if (!comedian) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const existing = await prisma.merchItem.findUnique({ where: { id: params.id } });
    if (!existing || existing.comedianId !== comedian.id) {
      return NextResponse.json({ error: "Not found or not yours" }, { status: 404 });
    }

    await prisma.merchItem.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete merch item" }, { status: 500 });
  }
}
