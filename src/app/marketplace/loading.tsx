export default function MarketplaceLoading() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="h-9 w-36 bg-zinc-700 rounded animate-pulse mb-2" />
        <div className="h-5 w-72 bg-zinc-800 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-card bg-brand-surface border border-zinc-800 overflow-hidden">
              <div className="aspect-video bg-zinc-700 animate-pulse" />
              <div className="p-4">
                <div className="h-5 w-32 bg-zinc-700 rounded animate-pulse mb-2" />
                <div className="h-4 w-full bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
