export default function CompareLoading() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="h-9 w-56 bg-zinc-700 rounded animate-pulse mb-2" />
        <div className="h-5 w-80 bg-zinc-800 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-2 gap-8">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-card bg-brand-surface border border-zinc-800 p-6">
              <div className="w-24 h-24 rounded-full bg-zinc-700 animate-pulse mx-auto mb-4" />
              <div className="h-6 w-32 bg-zinc-700 rounded animate-pulse mx-auto mb-2" />
              <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mx-auto mb-6" />
              <div className="space-y-3">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="h-4 bg-zinc-800 rounded animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
