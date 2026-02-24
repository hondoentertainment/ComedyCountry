export default function HomeLoading() {
  return (
    <main className="min-h-screen">
      <div className="bg-gradient-to-b from-brand-charcoal/80 to-transparent">
        <div className="mx-auto max-w-6xl px-4 pt-16 pb-12 sm:px-6">
          <div className="h-12 w-80 bg-zinc-700 rounded animate-pulse mb-2" />
          <div className="h-5 w-96 bg-zinc-800 rounded animate-pulse mb-8" />
          <div className="flex flex-wrap gap-2">
            <div className="h-10 w-40 bg-brand-gold/30 rounded-full animate-pulse" />
            <div className="h-10 w-32 bg-zinc-700 rounded-full animate-pulse" />
            <div className="h-10 w-28 bg-zinc-700 rounded-full animate-pulse" />
            <div className="h-10 w-24 bg-zinc-700 rounded-full animate-pulse" />
            <div className="h-10 w-20 bg-zinc-700 rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="mb-14">
          <div className="h-8 w-40 bg-zinc-800 rounded animate-pulse mb-4" />
          <div className="h-4 w-56 bg-zinc-800 rounded animate-pulse mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[4/3] rounded-lg bg-zinc-800 animate-pulse" />
            ))}
          </div>
        </div>
        <div className="mb-14">
          <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse mb-4" />
          <div className="h-4 w-64 bg-zinc-800 rounded animate-pulse mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-zinc-800 animate-pulse" />
            ))}
          </div>
        </div>
        <div className="mb-14">
          <div className="h-8 w-40 bg-zinc-800 rounded animate-pulse mb-4" />
          <div className="h-4 w-56 bg-zinc-800 rounded animate-pulse mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[16/10] rounded-lg bg-zinc-800 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
