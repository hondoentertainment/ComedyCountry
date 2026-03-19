export default function ActivityLoading() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="h-9 w-28 bg-zinc-700 rounded animate-pulse mb-2" />
        <div className="h-5 w-56 bg-zinc-800 rounded animate-pulse mb-8" />
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex gap-3 p-4 rounded-lg bg-brand-surface border border-zinc-800">
              <div className="w-10 h-10 rounded-full bg-zinc-700 animate-pulse shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-48 bg-zinc-700 rounded animate-pulse mb-2" />
                <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
