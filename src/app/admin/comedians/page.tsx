import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TOURING_STATUS_LABELS, PAGE_SIZE } from "@/lib/constants";
import { Pagination } from "@/components/Pagination";
import { AdminDeleteButton } from "@/components/AdminDeleteButton";

export const metadata = {
  title: "Manage Comedians | Admin",
};

type PageProps = {
  searchParams: Promise<{ search?: string; page?: string }>;
};

export default async function AdminComediansPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { search, page } = params;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const take = PAGE_SIZE;
  const skip = (currentPage - 1) * take;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { slug: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  let comedians: Array<{
    id: string;
    name: string;
    slug: string;
    touringStatus: string;
    genres: { id: string; genre: string }[];
    _count: { events: number; followers: number };
  }> = [];
  let total = 0;

  try {
    const [c, t] = await Promise.all([
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
    comedians = c;
    total = t;
  } catch {
    // DB not configured
  }

  return (
    <div className="md:mt-0 mt-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Comedians</h1>
          <p className="text-zinc-400 text-sm">{total} total</p>
        </div>
        <Link
          href="/admin/comedians/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Comedian
        </Link>
      </div>

      <form method="get" className="mb-6">
        <div className="flex gap-3">
          <input
            name="search"
            type="search"
            placeholder="Search comedians..."
            defaultValue={search}
            className="flex-1 px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors text-sm"
          >
            Search
          </button>
        </div>
      </form>

      <div className="rounded-card border border-zinc-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-brand-surface">
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Genres</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Events</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Followers</th>
                <th className="text-right px-4 py-3 text-zinc-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {comedians.map((comedian) => (
                <tr key={comedian.id} className="border-b border-zinc-800/50 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/comedians/${comedian.slug}`} className="text-white hover:text-brand-gold transition-colors font-medium">
                      {comedian.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-xs">
                      {TOURING_STATUS_LABELS[comedian.touringStatus] ?? comedian.touringStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {comedian.genres.map(g => g.genre).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{comedian._count.events}</td>
                  <td className="px-4 py-3 text-zinc-400">{comedian._count.followers}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/comedians/${comedian.id}`}
                        className="px-3 py-1 rounded-md bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 text-xs font-medium transition-colors"
                      >
                        Edit
                      </Link>
                      <AdminDeleteButton
                        endpoint={`/api/admin/comedians/${comedian.id}`}
                        itemName={comedian.name}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {comedians.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-zinc-400">No comedians found.</p>
        </div>
      )}

      <Pagination
        total={total}
        currentPage={currentPage}
        basePath="/admin/comedians"
        searchParams={{ search }}
      />
    </div>
  );
}
