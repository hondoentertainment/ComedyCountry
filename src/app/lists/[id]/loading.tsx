export default function ListDetailLoading() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse mb-6" />
        <div className="h-9 w-56 bg-zinc-700 rounded animate-pulse mb-2" />
        <div className="h-5 w-80 bg-zinc-800 rounded animate-pulse mb-8" />
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-4 p-4 rounded-lg bg-brand-surface border border-zinc-800">
              <div className="w-12 h-12 rounded-lg bg-zinc-700 animate-pulse shrink-0" />
              <div className="flex-1">
                <div className="h-5 w-40 bg-zinc-700 rounded animate-pulse mb-1" />
                <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
