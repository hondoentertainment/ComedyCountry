export default function ForYouLoading() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="h-9 w-40 bg-zinc-700 rounded animate-pulse mb-2" />
        <div className="h-5 w-72 bg-zinc-800 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-lg bg-brand-surface border border-zinc-800"
            >
              <div className="w-16 h-16 rounded-full mx-auto mb-3 bg-zinc-700 animate-pulse" />
              <div className="h-5 w-20 bg-zinc-700 rounded animate-pulse mx-auto mb-2" />
              <div className="h-4 w-full bg-zinc-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
