import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SHOW_TYPE_LABELS, PAGE_SIZE } from "@/lib/constants";
import { formatEventPrice } from "@/lib/format";
import { Pagination } from "@/components/Pagination";
import { AdminDeleteButton } from "@/components/AdminDeleteButton";

export const metadata = {
  title: "Manage Events | Admin",
};

type PageProps = {
  searchParams: Promise<{ search?: string; page?: string }>;
};

export default async function AdminEventsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { search, page } = params;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const take = PAGE_SIZE;
  const skip = (currentPage - 1) * take;

  const where = search
    ? {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { venue: { name: { contains: search, mode: "insensitive" as const } } },
        ],
      }
    : {};

  let events: Array<{
    id: string;
    date: string | Date;
    showtime: string | null;
    title: string | null;
    showType: string;
    priceMin: { toString: () => string } | null;
    priceMax: { toString: () => string } | null;
    venue: { id: string; name: string; city: string; state: string };
    comedians: Array<{ comedian: { id: string; name: string } }>;
    _count: { reviews: number };
  }> = [];
  let total = 0;

  try {
    const [e, t] = await Promise.all([
      prisma.event.findMany({
        where,
        take,
        skip,
        orderBy: { date: "desc" },
        include: {
          venue: { select: { id: true, name: true, city: true, state: true } },
          comedians: { include: { comedian: { select: { id: true, name: true } } } },
          _count: { select: { reviews: true } },
        },
      }),
      prisma.event.count({ where }),
    ]);
    events = e;
    total = t;
  } catch {
    // DB not configured
  }

  return (
    <div className="md:mt-0 mt-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Events</h1>
          <p className="text-zinc-400 text-sm">{total} total</p>
        </div>
        <Link
          href="/admin/events/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Event
        </Link>
      </div>

      <form method="get" className="mb-6">
        <div className="flex gap-3">
          <input
            name="search"
            type="search"
            placeholder="Search events..."
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
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Event</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Venue</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Date</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Type</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Price</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Reviews</th>
                <th className="text-right px-4 py-3 text-zinc-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const comedianNames = event.comedians
                  .map((ec: { comedian: { name: string } }) => ec.comedian.name)
                  .join(", ");
                const displayTitle = event.title || comedianNames || "Untitled";
                return (
                  <tr key={event.id} className="border-b border-zinc-800/50 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/events/${event.id}`} className="text-white hover:text-brand-gold transition-colors font-medium">
                        {displayTitle}
                      </Link>
                      {comedianNames && event.title && (
                        <p className="text-zinc-500 text-xs mt-0.5">{comedianNames}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {event.venue.name}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {new Date(event.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {event.showtime && (
                        <span className="text-zinc-500 ml-1">{event.showtime}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-xs">
                        {SHOW_TYPE_LABELS[event.showType] ?? event.showType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {formatEventPrice(event.priceMin, event.priceMax) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{event._count.reviews}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/events/${event.id}`}
                          className="px-3 py-1 rounded-md bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 text-xs font-medium transition-colors"
                        >
                          Edit
                        </Link>
                        <AdminDeleteButton
                          endpoint={`/api/admin/events/${event.id}`}
                          itemName={displayTitle}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {events.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-zinc-400">No events found.</p>
        </div>
      )}

      <Pagination
        total={total}
        currentPage={currentPage}
        basePath="/admin/events"
        searchParams={{ search }}
      />
    </div>
  );
}
