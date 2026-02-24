export default function ScheduleLoading() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="h-9 w-36 bg-zinc-700 rounded animate-pulse mb-2" />
        <div className="h-5 w-72 bg-zinc-800 rounded animate-pulse mb-8" />

        <div className="flex flex-wrap gap-3 mb-8 p-4 rounded-card bg-brand-surface border border-zinc-800/80">
          <div className="h-10 w-36 bg-zinc-700 rounded-lg animate-pulse" />
          <div className="h-10 w-24 bg-zinc-700 rounded-lg animate-pulse" />
          <div className="h-10 w-24 bg-zinc-700 rounded-lg animate-pulse" />
          <div className="h-10 w-20 bg-brand-gold/30 rounded-lg animate-pulse" />
        </div>

        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="flex flex-col sm:flex-row gap-4 p-0 overflow-hidden rounded-card bg-brand-surface border border-zinc-800"
            >
              <div className="sm:w-40 sm:min-w-[160px] aspect-video sm:aspect-square bg-zinc-700 animate-pulse shrink-0" />
              <div className="flex-1 p-4 flex flex-col justify-center">
                <div className="h-6 w-48 bg-zinc-700 rounded animate-pulse mb-2" />
                <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse mb-2" />
                <div className="h-4 w-40 bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
