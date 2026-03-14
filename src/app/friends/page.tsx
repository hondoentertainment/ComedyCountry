import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

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
      .map((c) => ({ connectionId: c.id, user: userMap.get(c.friendId) })),
    ...incoming
      .filter((c) => c.status === "accepted")
      .map((c) => ({ connectionId: c.id, user: userMap.get(c.userId) })),
  ];

  const pendingReceived = incoming
    .filter((c) => c.status === "pending")
    .map((c) => ({ connectionId: c.id, user: userMap.get(c.userId) }));

  const pendingSent = outgoing
    .filter((c) => c.status === "pending")
    .map((c) => ({ connectionId: c.id, user: userMap.get(c.friendId) }));

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-brand-gold mb-2">Friends</h1>
        <p className="text-zinc-400 mb-8">
          Your comedy crew. See who&apos;s going to shows and discover comedy together.
        </p>

        {/* Add Friend Form */}
        <div className="mb-8 p-4 rounded-lg bg-brand-surface border border-zinc-800">
          <h2 className="text-white font-semibold mb-3">Add a friend</h2>
          <form
            action="/api/friends"
            method="POST"
            className="flex gap-2"
          >
            <input
              type="text"
              name="username"
              placeholder="Enter username"
              required
              className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-brand-gold"
            />
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-brand-gold text-brand-dark font-semibold text-sm hover:bg-brand-gold/90 transition-colors"
            >
              Send Request
            </button>
          </form>
        </div>

        {/* Pending Received */}
        {pendingReceived.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">
              Pending Requests ({pendingReceived.length})
            </h2>
            <div className="space-y-2">
              {pendingReceived.map((item) => {
                const u = item.user;
                const displayName = u?.profileName || u?.name || "Unknown";
                return (
                  <div
                    key={item.connectionId}
                    className="flex items-center gap-3 p-3 rounded-lg bg-brand-surface border border-zinc-800"
                  >
                    {u?.image ? (
                      <Image
                        src={u.image}
                        alt=""
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-400 font-bold">
                        {displayName[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {displayName}
                      </p>
                      {u?.username && (
                        <p className="text-zinc-500 text-sm">@{u.username}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <form
                        action={`/api/friends/${item.connectionId}`}
                        method="POST"
                      >
                        <input
                          type="hidden"
                          name="action"
                          value="accept"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-md bg-brand-gold text-brand-dark text-sm font-medium hover:bg-brand-gold/90 transition-colors"
                        >
                          Accept
                        </button>
                      </form>
                      <form
                        action={`/api/friends/${item.connectionId}`}
                        method="POST"
                      >
                        <input
                          type="hidden"
                          name="action"
                          value="decline"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-400 text-sm hover:bg-zinc-700 hover:text-white transition-colors"
                        >
                          Decline
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Accepted Friends */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">
            Friends ({accepted.length})
          </h2>
          {accepted.length > 0 ? (
            <div className="space-y-2">
              {accepted.map((item) => {
                const u = item.user;
                const displayName = u?.profileName || u?.name || "Unknown";
                return (
                  <div
                    key={item.connectionId}
                    className="flex items-center gap-3 p-3 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    {u?.image ? (
                      <Image
                        src={u.image}
                        alt=""
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-400 font-bold">
                        {displayName[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {u?.username ? (
                        <Link
                          href={`/u/${u.username}`}
                          className="text-white font-medium hover:text-brand-gold transition-colors truncate block"
                        >
                          {displayName}
                        </Link>
                      ) : (
                        <p className="text-white font-medium truncate">
                          {displayName}
                        </p>
                      )}
                      {u?.username && (
                        <p className="text-zinc-500 text-sm">@{u.username}</p>
                      )}
                    </div>
                    <form
                      action={`/api/friends/${item.connectionId}`}
                      method="POST"
                    >
                      <input type="hidden" name="_method" value="DELETE" />
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-500 text-xs hover:bg-red-900/30 hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 px-6 rounded-lg bg-brand-surface border border-zinc-800 border-dashed text-center">
              <p className="text-zinc-400 font-medium mb-2">
                No friends yet
              </p>
              <p className="text-zinc-500 text-sm max-w-sm mx-auto">
                Search for other comedy fans by username to add them as friends.
              </p>
            </div>
          )}
        </section>

        {/* Pending Sent */}
        {pendingSent.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-zinc-400 mb-3">
              Sent Requests ({pendingSent.length})
            </h2>
            <div className="space-y-2">
              {pendingSent.map((item) => {
                const u = item.user;
                const displayName = u?.profileName || u?.name || "Unknown";
                return (
                  <div
                    key={item.connectionId}
                    className="flex items-center gap-3 p-3 rounded-lg bg-brand-surface/50 border border-zinc-800/50"
                  >
                    {u?.image ? (
                      <Image
                        src={u.image}
                        alt=""
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full object-cover opacity-70"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 text-sm font-bold">
                        {displayName[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-400 text-sm truncate">
                        {displayName}
                      </p>
                    </div>
                    <span className="text-zinc-600 text-xs">Pending</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
