export default function ComediansLoading() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="h-9 w-48 rounded bg-zinc-800 animate-pulse mb-1" />
            <div className="h-4 w-72 rounded bg-zinc-800 animate-pulse" />
          </div>
        </div>

        {/* Filter bar skeleton */}
        <div className="flex flex-wrap gap-3 mb-8 p-4 rounded-card bg-brand-surface border border-zinc-800/80">
          {/* Search input */}
          <div className="w-full h-[42px] rounded-lg bg-zinc-900/80 animate-pulse" />
          {/* Status select */}
          <div className="h-[42px] w-32 rounded-lg bg-zinc-900/80 animate-pulse" />
          {/* Genre select */}
          <div className="h-[42px] w-[140px] rounded-lg bg-zinc-900/80 animate-pulse" />
          {/* Filter button */}
          <div className="h-[42px] w-20 rounded-lg bg-zinc-800 animate-pulse" />
        </div>

        {/* Card grid skeleton — 10 cards in 5-column layout */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-card bg-brand-surface overflow-hidden">
              {/* Square image area */}
              <div className="aspect-square bg-zinc-800 animate-pulse" />
              {/* Text area */}
              <div className="p-3">
                <div className="h-5 w-3/4 rounded bg-zinc-800 animate-pulse" />
                <div className="flex gap-1.5 mt-2">
                  <div className="h-5 w-16 rounded bg-zinc-800 animate-pulse" />
                  <div className="h-5 w-12 rounded bg-zinc-800 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
