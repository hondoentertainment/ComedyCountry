export default function FeedLoading() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="h-9 w-24 bg-zinc-800 rounded animate-pulse mb-2" />
        <div className="h-5 w-72 bg-zinc-800/60 rounded animate-pulse mb-8" />
        <div className="flex gap-2 mb-6">
          <div className="h-10 w-16 bg-zinc-800 rounded-lg animate-pulse" />
          <div className="h-10 w-24 bg-zinc-800 rounded-lg animate-pulse" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg border border-zinc-800 bg-brand-surface/50">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-3 w-72 bg-zinc-800/60 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
