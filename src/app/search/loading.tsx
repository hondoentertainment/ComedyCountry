export default function SearchLoading() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="h-9 w-32 bg-zinc-700 rounded animate-pulse mb-2" />
        <div className="h-5 w-64 bg-zinc-800 rounded animate-pulse mb-8" />
        <div className="space-y-10">
          <section>
            <div className="h-6 w-24 bg-zinc-700 rounded animate-pulse mb-4" />
            <div className="grid gap-4 sm:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="flex gap-4 p-4 rounded-lg bg-brand-charcoal/50 border border-zinc-800"
                >
                  <div className="w-16 h-16 rounded-lg bg-zinc-700 animate-pulse shrink-0" />
                  <div className="h-5 w-28 bg-zinc-700 rounded animate-pulse self-center" />
                </div>
              ))}
            </div>
          </section>
          <section>
            <div className="h-6 w-20 bg-zinc-700 rounded animate-pulse mb-4" />
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-zinc-800 rounded-lg animate-pulse"
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
