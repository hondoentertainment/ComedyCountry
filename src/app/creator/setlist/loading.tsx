export default function CreatorSetlistLoading() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="h-9 w-48 bg-zinc-700 rounded animate-pulse mb-2" />
        <div className="h-5 w-72 bg-zinc-800 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 rounded-lg bg-brand-surface border border-zinc-800">
              <div className="h-8 w-16 bg-zinc-700 rounded animate-pulse mb-2" />
              <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-zinc-800/50 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
