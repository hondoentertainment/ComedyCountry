export default function SettingsLoading() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mb-4" />
        <div className="h-9 w-28 bg-zinc-700 rounded animate-pulse mb-2" />
        <div className="h-5 w-80 bg-zinc-800 rounded animate-pulse mb-8" />
        <div className="space-y-8">
          <div>
            <div className="h-6 w-32 bg-zinc-700 rounded animate-pulse mb-4" />
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-brand-charcoal/50 rounded-lg border border-zinc-800 animate-pulse"
                />
              ))}
            </div>
          </div>
          <div>
            <div className="h-6 w-24 bg-zinc-700 rounded animate-pulse mb-4" />
            <div className="space-y-4">
              <div className="h-24 bg-brand-charcoal/50 rounded-lg border border-zinc-800 animate-pulse" />
              <div className="h-32 bg-brand-charcoal/50 rounded-lg border border-zinc-800 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
