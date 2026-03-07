import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { VENUE_TYPE_LABELS, PAGE_SIZE } from "@/lib/constants";
import { Pagination } from "@/components/Pagination";
import { AdminVenueActions } from "@/components/AdminVenueActions";

export const metadata = {
  title: "Manage Venues | Admin",
};

type PageProps = {
  searchParams: Promise<{ search?: string; page?: string }>;
};

export default async function AdminVenuesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { search, page } = params;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const take = PAGE_SIZE;
  const skip = (currentPage - 1) * take;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { city: { contains: search, mode: "insensitive" as const } },
          { state: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  let venues: Array<{
    id: string;
    name: string;
    city: string;
    state: string;
    type: string;
    capacity: number | null;
    _count: { events: number };
  }> = [];
  let total = 0;

  try {
    const [v, t] = await Promise.all([
      prisma.venue.findMany({
        where,
        take,
        skip,
        orderBy: [{ state: "asc" }, { city: "asc" }, { name: "asc" }],
        include: { _count: { select: { events: true } } },
      }),
      prisma.venue.count({ where }),
    ]);
    venues = v;
    total = t;
  } catch {
    // DB not configured
  }

  return (
    <div className="md:mt-0 mt-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Venues</h1>
          <p className="text-zinc-400 text-sm">{total} total</p>
        </div>
        <Link
          href="/admin/venues?modal=create"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Venue
        </Link>
      </div>

      <form method="get" className="mb-6">
        <div className="flex gap-3">
          <input
            name="search"
            type="search"
            placeholder="Search venues..."
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
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Location</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Type</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Capacity</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Events</th>
                <th className="text-right px-4 py-3 text-zinc-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {venues.map((venue) => (
                <tr key={venue.id} className="border-b border-zinc-800/50 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/venues/${venue.id}`} className="text-white hover:text-brand-gold transition-colors font-medium">
                      {venue.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {venue.city}, {venue.state}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-xs">
                      {VENUE_TYPE_LABELS[venue.type] ?? venue.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {venue.capacity?.toLocaleString() ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {venue._count.events}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AdminVenueActions venueId={venue.id} venueName={venue.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {venues.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-zinc-400">No venues found.</p>
        </div>
      )}

      <Pagination
        total={total}
        currentPage={currentPage}
        basePath="/admin/venues"
        searchParams={{ search }}
      />
    </div>
  );
}
