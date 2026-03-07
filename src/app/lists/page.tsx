import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const metadata = {
  title: "Comedy Lists | Punchline Atlas",
  description: "Browse and create curated comedy lists — collections of comedians, venues, and shows. Share your favorites with the community.",
};

export const dynamic = "force-dynamic";

export default async function ListsPage() {
  const session = await getServerSession(authOptions);

  let publicLists: Array<{
    id: string; title: string; description: string | null; coverUrl: string | null;
    createdAt: Date; updatedAt: Date;
    user: { profileName: string | null; name: string | null };
    _count: { items: number; saves: number };
  }> = [];
  let myLists: typeof publicLists = [];

  try {
    const [pub, mine] = await Promise.all([
      prisma.comedyList.findMany({
        where: { isPublic: true },
        include: {
          user: { select: { profileName: true, name: true } },
          _count: { select: { items: true, saves: true } },
        },
        orderBy: { saves: { _count: "desc" } },
        take: 30,
      }),
      session?.user?.id
        ? prisma.comedyList.findMany({
            where: { userId: session.user.id },
            include: {
              user: { select: { profileName: true, name: true } },
              _count: { select: { items: true, saves: true } },
            },
            orderBy: { updatedAt: "desc" },
          })
        : [],
    ]);
    publicLists = pub;
    myLists = mine;
  } catch {
    // DB not configured
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-gold">Comedy Lists</h1>
          <p className="text-zinc-400 mt-1">Curated collections of comedians, venues, and shows.</p>
        </div>
        {session && (
          <Link
            href="/lists/new"
            className="px-4 py-2 rounded-lg bg-brand-gold text-brand-dark font-semibold text-sm hover:bg-brand-gold/90 transition-colors"
          >
            Create list
          </Link>
        )}
      </div>

      {/* My Lists */}
      {myLists.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">My Lists</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myLists.map((list) => (
              <ListCard key={list.id} list={list} />
            ))}
          </div>
        </section>
      )}

      {/* Public Lists */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4">Popular Lists</h2>
        {publicLists.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {publicLists.map((list) => (
              <ListCard key={list.id} list={list} />
            ))}
          </div>
        ) : (
          <p className="text-zinc-500">No public lists yet. Be the first to create one!</p>
        )}
      </section>
    </div>
  );
}

function ListCard({ list }: { list: { id: string; title: string; description: string | null; user: { profileName: string | null; name: string | null }; _count: { items: number; saves: number } } }) {
  return (
    <Link
      href={`/lists/${list.id}`}
      className="block p-5 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors"
    >
      <h3 className="font-semibold text-white truncate">{list.title}</h3>
      {list.description && (
        <p className="text-zinc-500 text-sm mt-1 line-clamp-2">{list.description}</p>
      )}
      <div className="flex items-center gap-3 mt-3 text-xs text-zinc-500">
        <span>by {list.user.profileName || list.user.name || "Anonymous"}</span>
        <span>{list._count.items} items</span>
        <span>{list._count.saves} saves</span>
      </div>
    </Link>
  );
}
