import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getComedianForUser } from "@/lib/creator";

type UnauthorizedResult = {
  authorized: false;
  reason: "Not authenticated" | "Not authorized";
  status: 401 | 403;
};

type AuthorizedResult = {
  authorized: true;
  session: Session;
};

type CreatorAuthorizedResult = AuthorizedResult & {
  comedian: NonNullable<Awaited<ReturnType<typeof getComedianForUser>>>;
};

export async function requireAdmin(): Promise<AuthorizedResult | UnauthorizedResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { authorized: false, reason: "Not authenticated", status: 401 };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  const effectiveRole = user?.role ?? session.user.role;
  if (effectiveRole !== "admin") {
    return { authorized: false, reason: "Not authorized", status: 403 };
  }

  return { authorized: true, session };
}

export async function requireCreator(): Promise<CreatorAuthorizedResult | UnauthorizedResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { authorized: false, reason: "Not authenticated", status: 401 };
  }

  const comedian = await getComedianForUser(session.user.id);
  if (!comedian) {
    return { authorized: false, reason: "Not authorized", status: 403 };
  }

  return { authorized: true, session, comedian };
}
