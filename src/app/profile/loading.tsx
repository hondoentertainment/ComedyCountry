export default function ProfileLoading() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse mb-8" />
        <header className="flex gap-6 mb-8">
          <div className="w-24 h-24 rounded-full bg-zinc-700 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-8 w-48 bg-zinc-700 rounded animate-pulse" />
            <div className="h-10 w-32 bg-zinc-800 rounded animate-pulse" />
          </div>
        </header>
        <div className="space-y-6">
          <div>
            <div className="h-6 w-40 bg-zinc-700 rounded animate-pulse mb-4" />
            <div className="grid gap-4 sm:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-24 rounded-lg bg-brand-charcoal/50 border border-zinc-800 animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
