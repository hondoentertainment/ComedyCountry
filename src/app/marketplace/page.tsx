import Link from "next/link";
import { getTalentListings } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Talent Marketplace | Punchline Atlas",
  description: "Browse open gig listings and find your next comedy booking.",
};

type PageProps = {
  searchParams: Promise<{
    city?: string;
    state?: string;
    showType?: string;
    genre?: string;
    page?: string;
  }>;
};

export default async function MarketplacePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { city, state, showType, genre, page } = params;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);

  let listings: Awaited<ReturnType<typeof getTalentListings>>["listings"] = [];
  let total = 0;
  let pages = 1;

  try {
    const result = await getTalentListings({
      city: city || undefined,
      state: state || undefined,
      showType: showType || undefined,
      genre: genre || undefined,
      page: currentPage,
    });
    listings = result.listings;
    total = result.total;
    pages = result.pages;
  } catch {
    // DB not configured
  }

  const showTypes = ["headliner", "feature", "host", "open_mic"];

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Talent Marketplace</h1>
          <p className="text-zinc-400 text-sm">
            {total} open gig{total !== 1 ? "s" : ""} — find your next booking
          </p>
        </div>

        {/* Filter bar */}
        <form
          method="get"
          className="flex flex-wrap gap-3 mb-8 p-4 rounded-xl bg-brand-surface border border-zinc-800/80"
        >
          <div className="flex-1 min-w-[160px]">
            <input
              name="city"
              type="text"
              placeholder="City"
              defaultValue={city}
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            />
          </div>
          <div className="min-w-[120px]">
            <input
              name="state"
              type="text"
              placeholder="State"
              defaultValue={state}
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            />
          </div>
          <div className="min-w-[160px]">
            <select
              name="showType"
              defaultValue={showType ?? ""}
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            >
              <option value="">All Types</option>
              {showTypes.map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[140px]">
            <input
              name="genre"
              type="text"
              placeholder="Genre"
              defaultValue={genre}
              className="w-full px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 bg-brand-gold text-brand-dark font-semibold rounded-lg hover:bg-brand-gold/90 transition"
          >
            Search
          </button>
        </form>

        {/* Listings grid */}
        {listings.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <p className="text-lg">No open listings found.</p>
            <p className="text-sm mt-1">Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/marketplace/${listing.id}`}
                className="block p-5 rounded-xl bg-brand-surface border border-zinc-800/80 hover:border-brand-gold/40 transition group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-gold/20 text-brand-gold">
                    {listing.showType.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {new Date(listing.date).toLocaleDateString()}
                  </span>
                </div>

                {listing.genre && (
                  <p className="text-sm text-zinc-400 mb-2">Genre: {listing.genre}</p>
                )}

                {(listing.budgetMin || listing.budgetMax) && (
                  <p className="text-sm text-zinc-300 mb-2">
                    Budget: {listing.budgetMin ? `$${Number(listing.budgetMin)}` : ""}
                    {listing.budgetMin && listing.budgetMax ? " - " : ""}
                    {listing.budgetMax ? `$${Number(listing.budgetMax)}` : ""}
                  </p>
                )}

                {listing.description && (
                  <p className="text-sm text-zinc-400 line-clamp-2">{listing.description}</p>
                )}

                <div className="mt-3 text-sm font-medium text-brand-gold group-hover:underline">
                  View Details &rarr;
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/marketplace?${new URLSearchParams({
                  ...(city && { city }),
                  ...(state && { state }),
                  ...(showType && { showType }),
                  ...(genre && { genre }),
                  page: String(p),
                }).toString()}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  p === currentPage
                    ? "bg-brand-gold text-brand-dark"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {p}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
