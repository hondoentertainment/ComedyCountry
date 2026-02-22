export default function ScheduleLoading() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="h-9 w-32 bg-zinc-700 rounded animate-pulse mb-2" />
        <div className="h-5 w-80 bg-zinc-800 rounded animate-pulse mb-8" />

        <div className="flex flex-wrap gap-4 mb-8 p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800">
          <div className="h-10 w-36 bg-zinc-700 rounded animate-pulse" />
          <div className="h-10 w-24 bg-zinc-700 rounded animate-pulse" />
          <div className="h-10 w-32 bg-zinc-700 rounded animate-pulse" />
          <div className="h-10 w-20 bg-brand-gold/30 rounded animate-pulse" />
        </div>

        <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mb-4" />

        <ul className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <li key={i} className="p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800">
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div className="min-w-0">
                  <div className="h-5 w-64 bg-zinc-700 rounded animate-pulse mb-2" />
                  <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse mb-2" />
                  <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse mb-2" />
                  <div className="h-5 w-20 bg-zinc-700 rounded animate-pulse" />
                </div>
                <div className="flex gap-2 shrink-0">
                  <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-8 w-20 bg-brand-gold/30 rounded animate-pulse" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
