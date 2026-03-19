export default function UserProfileLoading() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <header className="flex items-center gap-6 mb-8 p-6 rounded-card bg-brand-surface border border-zinc-800">
          <div className="w-24 h-24 rounded-full bg-zinc-700 animate-pulse shrink-0" />
          <div className="flex-1">
            <div className="h-7 w-40 bg-zinc-700 rounded animate-pulse mb-2" />
            <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse mb-3" />
            <div className="flex gap-4">
              <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
        </header>
        <div className="h-6 w-32 bg-zinc-700 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-zinc-800/50 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
