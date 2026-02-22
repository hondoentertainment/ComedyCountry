export default function VenuesLoading() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="h-9 w-48 bg-zinc-700 rounded animate-pulse mb-2" />
        <div className="h-5 w-96 bg-zinc-800 rounded animate-pulse mb-8" />

        <div className="flex flex-wrap gap-4 mb-8 p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800">
          <div className="h-10 w-48 bg-zinc-700 rounded animate-pulse" />
          <div className="h-10 w-32 bg-zinc-700 rounded animate-pulse" />
          <div className="h-10 w-24 bg-zinc-700 rounded animate-pulse" />
          <div className="h-10 w-28 bg-zinc-700 rounded animate-pulse" />
          <div className="h-10 w-20 bg-brand-gold/30 rounded animate-pulse" />
        </div>

        <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mb-4" />

        <ul className="divide-y divide-zinc-800">
          {[...Array(8)].map((_, i) => (
            <li key={i} className="py-4">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="h-5 w-56 bg-zinc-700 rounded animate-pulse mb-2" />
                  <div className="h-4 w-40 bg-zinc-800 rounded animate-pulse mb-2" />
                  <div className="h-5 w-20 bg-zinc-700 rounded animate-pulse" />
                </div>
                <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse shrink-0" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
