import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const metadata = {
  title: "Fan Clubs | Punchline Atlas",
  description: "Browse and join comedy fan clubs.",
};

export const dynamic = "force-dynamic";

export default async function FanClubsPage() {
  const session = await getServerSession(authOptions);

  let publicClubs: Array<{
    id: string;
    name: string;
    description: string | null;
    coverUrl: string | null;
    isPublic: boolean;
    createdAt: Date;
    _count: { members: number };
  }> = [];
  let myClubs: typeof publicClubs = [];

  try {
    const [pub, mine] = await Promise.all([
      prisma.fanClub.findMany({
        where: { isPublic: true },
        include: { _count: { select: { members: true } } },
        orderBy: { members: { _count: "desc" } },
        take: 50,
      }),
      session?.user?.id
        ? prisma.fanClub.findMany({
            where: { members: { some: { userId: session.user.id } } },
            include: { _count: { select: { members: true } } },
            orderBy: { updatedAt: "desc" },
          })
        : [],
    ]);
    publicClubs = pub;
    myClubs = mine;
  } catch {
    // DB not configured
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-gold">Fan Clubs</h1>
          <p className="text-zinc-400 mt-1">
            Join fan clubs and connect with other comedy enthusiasts.
          </p>
        </div>
        {session && (
          <Link
            href="/fan-clubs/new"
            className="px-4 py-2 rounded-lg bg-brand-gold text-brand-dark font-semibold text-sm hover:bg-brand-gold/90 transition-colors"
          >
            Create Club
          </Link>
        )}
      </div>

      {/* My Clubs */}
      {myClubs.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">My Clubs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myClubs.map((club) => (
              <ClubCard key={club.id} club={club} />
            ))}
          </div>
        </section>
      )}

      {/* Public Clubs */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4">
          Popular Clubs
        </h2>
        {publicClubs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {publicClubs.map((club) => (
              <ClubCard key={club.id} club={club} />
            ))}
          </div>
        ) : (
          <p className="text-zinc-500">
            No public fan clubs yet. Create the first one!
          </p>
        )}
      </section>
    </div>
  );
}

function ClubCard({
  club,
}: {
  club: {
    id: string;
    name: string;
    description: string | null;
    _count: { members: number };
  };
}) {
  return (
    <Link
      href={`/fan-clubs/${club.id}`}
      className="block p-5 rounded-lg bg-brand-surface border border-zinc-800 hover:border-zinc-700 transition-colors"
    >
      <h3 className="font-semibold text-white truncate">{club.name}</h3>
      {club.description && (
        <p className="text-zinc-500 text-sm mt-1 line-clamp-2">
          {club.description}
        </p>
      )}
      <div className="mt-3 text-xs text-zinc-500">
        {club._count.members} member{club._count.members !== 1 ? "s" : ""}
      </div>
    </Link>
  );
}
