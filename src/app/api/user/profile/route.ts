import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function PATCH(request: Request) {
  const rl = await checkRateLimit(`user-profile:${getRateLimitKey(request)}`, { limit: 60, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

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
