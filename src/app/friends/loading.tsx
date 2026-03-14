export default function FriendsLoading() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="h-9 w-32 bg-zinc-700 rounded animate-pulse mb-2" />
        <div className="h-5 w-96 bg-zinc-800 rounded animate-pulse mb-8" />
        <section className="mb-8">
          <div className="h-6 w-36 bg-zinc-700 rounded animate-pulse mb-4" />
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="flex gap-3 p-3 rounded-lg bg-brand-charcoal/50 border border-zinc-800"
              >
                <div className="w-10 h-10 rounded-full bg-zinc-700 animate-pulse shrink-0" />
                <div className="flex-1">
                  <div className="h-5 w-24 bg-zinc-700 rounded animate-pulse mb-2" />
                  <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
                </div>
                <div className="h-8 w-16 bg-zinc-700 rounded animate-pulse shrink-0" />
              </div>
            ))}
          </div>
        </section>
        <section>
          <div className="h-6 w-28 bg-zinc-700 rounded animate-pulse mb-4" />
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex gap-3 p-3 rounded-lg bg-brand-charcoal/50 border border-zinc-800"
              >
                <div className="w-10 h-10 rounded-full bg-zinc-700 animate-pulse shrink-0" />
                <div className="flex-1 h-10 bg-zinc-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
