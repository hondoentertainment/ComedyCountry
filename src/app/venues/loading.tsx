export default function VenuesLoading() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="h-9 w-40 rounded bg-zinc-800 animate-pulse mb-1" />
            <div className="h-4 w-64 rounded bg-zinc-800 animate-pulse" />
          </div>
        </div>

        {/* Filter bar skeleton */}
        <div className="flex flex-wrap gap-3 mb-8 p-4 rounded-card bg-brand-surface border border-zinc-800/80">
          {/* Search input */}
          <div className="w-full h-[42px] rounded-lg bg-zinc-900/80 animate-pulse" />
          {/* State select */}
          <div className="h-[42px] w-28 rounded-lg bg-zinc-900/80 animate-pulse" />
          {/* City input */}
          <div className="h-[42px] w-36 rounded-lg bg-zinc-900/80 animate-pulse" />
          {/* Type select */}
          <div className="h-[42px] w-28 rounded-lg bg-zinc-900/80 animate-pulse" />
          {/* Filter button */}
          <div className="h-[42px] w-20 rounded-lg bg-zinc-800 animate-pulse" />
        </div>

        {/* Card grid skeleton — 6 cards in 3-column layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-card bg-brand-surface overflow-hidden">
              {/* Image area */}
              <div className="aspect-[16/10] bg-zinc-800 animate-pulse" />
              {/* Text area */}
              <div className="p-4">
                <div className="h-5 w-3/4 rounded bg-zinc-800 animate-pulse" />
                <div className="h-4 w-1/2 rounded bg-zinc-800 animate-pulse mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
