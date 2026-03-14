import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getComedianForUser } from "@/lib/creator";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const comedianId = searchParams.get("comedianId");

  if (!comedianId) {
    return NextResponse.json({ error: "comedianId is required" }, { status: 400 });
  }

  try {
    const items = await prisma.merchItem.findMany({
      where: { comedianId, inStock: true },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Failed to fetch merch" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const comedian = await getComedianForUser(session.user.id);
  if (!comedian) {
    return NextResponse.json({ error: "You must have an approved comedian profile" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, description, price, imageUrl, externalUrl } = body;

    if (!name || !price || typeof price !== "number" || price <= 0) {
      return NextResponse.json({ error: "name and a positive price are required" }, { status: 400 });
    }

    const item = await prisma.merchItem.create({
      data: {
        comedianId: comedian.id,
        name,
        description: description ?? null,
        price,
        imageUrl: imageUrl ?? null,
        externalUrl: externalUrl ?? null,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create merch item" }, { status: 500 });
  }
}
