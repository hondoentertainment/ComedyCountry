export default function PricingLoading() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="text-center mb-12">
          <div className="h-10 w-40 bg-zinc-700 rounded animate-pulse mx-auto mb-4" />
          <div className="h-5 w-72 bg-zinc-800 rounded animate-pulse mx-auto" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl bg-brand-surface border border-zinc-800 p-6">
              <div className="h-6 w-24 bg-zinc-700 rounded animate-pulse mb-2" />
              <div className="h-10 w-20 bg-zinc-700 rounded animate-pulse mb-4" />
              <div className="space-y-2">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="h-4 w-full bg-zinc-800 rounded animate-pulse" />
                ))}
              </div>
              <div className="h-10 bg-brand-gold/30 rounded-lg animate-pulse mt-6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
