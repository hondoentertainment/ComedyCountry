export default function TicketsLoading() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <div className="h-9 w-36 bg-zinc-700 rounded animate-pulse mb-2" />
          <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="h-6 w-40 bg-zinc-700 rounded animate-pulse mb-4" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-card bg-brand-surface border border-zinc-800/80 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="h-5 w-48 bg-zinc-700 rounded animate-pulse mb-2" />
                  <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse mb-1" />
                  <div className="h-4 w-40 bg-zinc-800 rounded animate-pulse" />
                </div>
                <div className="w-16 h-16 bg-zinc-700 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
