import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { profileName?: string | null } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const profileName =
    body.profileName === undefined
      ? undefined
      : (body.profileName === null || body.profileName === ""
          ? null
          : String(body.profileName).trim() || null);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { profileName },
  });

  return NextResponse.json({ ok: true });
}
