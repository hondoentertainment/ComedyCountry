export default function VenuesLoading() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="h-9 w-40 bg-zinc-700 rounded animate-pulse mb-2" />
        <div className="h-5 w-96 bg-zinc-800 rounded animate-pulse mb-8" />

        <div className="flex flex-wrap gap-3 mb-8 p-4 rounded-card bg-brand-surface border border-zinc-800/80">
          <div className="flex-1 min-w-[200px] h-10 bg-zinc-700 rounded-lg animate-pulse" />
          <div className="h-10 w-24 bg-zinc-700 rounded-lg animate-pulse" />
          <div className="h-10 w-28 bg-zinc-700 rounded-lg animate-pulse" />
          <div className="h-10 w-32 bg-zinc-700 rounded-lg animate-pulse" />
          <div className="h-10 w-20 bg-brand-gold/30 rounded-lg animate-pulse" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="overflow-hidden rounded-card bg-brand-charcoal/50 border border-zinc-800">
              <div className="aspect-[16/10] bg-zinc-700 animate-pulse" />
              <div className="p-4">
                <div className="h-5 w-32 bg-zinc-700 rounded animate-pulse mb-2" />
                <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
