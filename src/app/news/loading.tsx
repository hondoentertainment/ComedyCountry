export default function NewsLoading() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <div className="h-9 w-40 bg-zinc-700 rounded animate-pulse mb-2" />
          <div className="h-5 w-80 bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="flex flex-wrap gap-2 mb-8">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 w-24 bg-zinc-800 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="rounded-xl bg-brand-surface border border-zinc-800/80 overflow-hidden">
              <div className="aspect-video bg-zinc-700 animate-pulse" />
              <div className="p-4">
                <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse mb-2" />
                <div className="h-5 w-full bg-zinc-700 rounded animate-pulse mb-2" />
                <div className="h-4 w-3/4 bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
