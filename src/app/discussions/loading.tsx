export default function DiscussionsLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-9 w-64 bg-zinc-700 rounded animate-pulse mb-2" />
          <div className="h-5 w-80 bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="h-10 w-28 bg-brand-gold/30 rounded-lg animate-pulse" />
      </div>
      <div className="flex gap-2 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 w-20 bg-zinc-800 rounded-md animate-pulse" />
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="p-4 rounded-lg bg-brand-surface border border-zinc-800">
            <div className="h-5 w-64 bg-zinc-700 rounded animate-pulse mb-2" />
            <div className="h-4 w-full bg-zinc-800 rounded animate-pulse mb-2" />
            <div className="flex gap-3 mt-2">
              <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
