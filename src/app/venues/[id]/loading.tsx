export default function VenueLoading() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mb-6" />
        <div className="h-48 rounded-lg bg-zinc-700 animate-pulse mb-8" />
        <div className="flex gap-3 mb-2">
          <div className="h-9 w-56 bg-zinc-700 rounded animate-pulse" />
          <div className="h-10 w-24 bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="h-5 w-64 bg-zinc-800 rounded animate-pulse mb-8" />
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
