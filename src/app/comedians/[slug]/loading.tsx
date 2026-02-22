export default function ComedianLoading() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mb-6" />
        <div className="flex flex-col sm:flex-row gap-6 mb-8">
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-lg bg-zinc-700 animate-pulse shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="h-9 w-64 bg-zinc-700 rounded animate-pulse mb-4" />
            <div className="h-5 w-32 bg-zinc-800 rounded animate-pulse mb-4" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-11/12 bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="h-6 w-32 bg-zinc-700 rounded animate-pulse mb-4" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-lg bg-zinc-800/50 animate-pulse"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
