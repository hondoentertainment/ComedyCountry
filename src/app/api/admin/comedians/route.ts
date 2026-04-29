import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const take = 50;
  const skip = (page - 1) * take;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { slug: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [comedians, total] = await Promise.all([
    prisma.comedian.findMany({
      where,
      take,
      skip,
      orderBy: { name: "asc" },
      include: {
        genres: true,
        _count: { select: { events: true, followers: true } },
      },
    }),
    prisma.comedian.count({ where }),
  ]);

  return NextResponse.json({ comedians, total, page, pages: Math.ceil(total / take) });
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status });
  }

  const body = await request.json();
  const { name, bio, headshotUrl, touringStatus, website, yearsActiveFrom, yearsActiveTo, representation, genres, instagramHandle } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  let slug = body.slug || slugify(name);
  // Ensure unique slug
  const existing = await prisma.comedian.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const comedian = await prisma.comedian.create({
    data: {
      name,
      slug,
      bio: bio || null,
      headshotUrl: headshotUrl || null,
      touringStatus: touringStatus || "UNKNOWN",
      website: website || null,
      yearsActiveFrom: yearsActiveFrom ? parseInt(yearsActiveFrom, 10) : null,
      yearsActiveTo: yearsActiveTo ? parseInt(yearsActiveTo, 10) : null,
      representation: representation || null,
      ...(genres?.length > 0 && {
        genres: {
          create: genres.map((g: string) => ({ genre: g })),
        },
      }),
      ...(instagramHandle && {
        socialLinks: {
          create: [{ platform: "instagram", url: `https://instagram.com/${instagramHandle.replace("@", "")}` }],
        },
      }),
    },
  });

  return NextResponse.json(comedian, { status: 201 });
}
