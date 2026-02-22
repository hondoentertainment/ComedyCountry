export default function RootLoading() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="h-10 w-64 bg-zinc-700 rounded animate-pulse mb-4" />
        <div className="h-5 w-96 bg-zinc-800 rounded animate-pulse mb-8" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-lg bg-brand-charcoal/50 border border-zinc-800 animate-pulse"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
