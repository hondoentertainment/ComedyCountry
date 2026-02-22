import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      followsComedians: {
        include: {
          comedian: {
            select: {
              id: true,
              name: true,
              slug: true,
              headshotUrl: true,
              bio: true,
              website: true,
              touringStatus: true,
            },
          },
        },
      },
      followsVenues: {
        include: {
          venue: {
            select: {
              id: true,
              name: true,
              address: true,
              city: true,
              state: true,
              type: true,
              website: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      name: user.name,
      profileName: user.profileName,
      email: user.email,
      image: user.image,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
    favoriteComedians: user.followsComedians.map((f) => ({
      ...f.comedian,
      followedAt: f.createdAt.toISOString(),
    })),
    savedVenues: user.followsVenues.map((f) => ({
      ...f.venue,
      followedAt: f.createdAt.toISOString(),
    })),
  };

  return NextResponse.json(exportData);
}
