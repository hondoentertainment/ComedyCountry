export default function MarketplaceItemLoading() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mb-6" />
        <div className="h-9 w-72 bg-zinc-700 rounded animate-pulse mb-4" />
        <div className="h-5 w-48 bg-zinc-800 rounded animate-pulse mb-8" />
        <div className="h-48 rounded-lg bg-zinc-800/50 animate-pulse mb-8" />
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-4 bg-zinc-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
