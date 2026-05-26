import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { FriendsManager } from "./FriendsManager";

export const metadata = {
  title: "Friends | Punchline Atlas",
  description: "Manage your comedy crew. Find friends, send requests, and see who's going to shows.",
};

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/friends");
  }

  const userId = session.user.id;

  const [outgoing, incoming] = await Promise.all([
    prisma.friendConnection.findMany({
      where: { userId },
      select: { id: true, friendId: true, status: true, createdAt: true },
    }),
    prisma.friendConnection.findMany({
      where: { friendId: userId },
      select: { id: true, userId: true, status: true, createdAt: true },
    }),
  ]);

  const relatedIds = [
    ...outgoing.map((c) => c.friendId),
    ...incoming.map((c) => c.userId),
  ];

  const users =
    relatedIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: relatedIds } },
          select: {
            id: true,
            name: true,
            profileName: true,
            image: true,
            username: true,
          },
        })
      : [];

  const userMap = new Map(users.map((u) => [u.id, u]));

  const accepted = [
    ...outgoing
      .filter((c) => c.status === "accepted")
      .map((c) => ({ connectionId: c.id, user: userMap.get(c.friendId) ?? null })),
    ...incoming
      .filter((c) => c.status === "accepted")
      .map((c) => ({ connectionId: c.id, user: userMap.get(c.userId) ?? null })),
  ];

  const pendingReceived = incoming
    .filter((c) => c.status === "pending")
    .map((c) => ({ connectionId: c.id, user: userMap.get(c.userId) ?? null }));

  const pendingSent = outgoing
    .filter((c) => c.status === "pending")
    .map((c) => ({ connectionId: c.id, user: userMap.get(c.friendId) ?? null }));

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-brand-gold mb-2">Friends</h1>
        <p className="text-zinc-400 mb-8">
          Your comedy crew. See who&apos;s going to shows and discover comedy together.
        </p>
        <FriendsManager
          initialAccepted={accepted}
          initialPendingReceived={pendingReceived}
          initialPendingSent={pendingSent}
        />
      </div>
    </div>
  );
}
