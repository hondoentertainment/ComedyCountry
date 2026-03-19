export default function ComedianClaimLoading() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="h-9 w-56 bg-zinc-700 rounded animate-pulse mb-2" />
        <div className="h-5 w-72 bg-zinc-800 rounded animate-pulse mb-8" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mb-2" />
              <div className="h-10 bg-zinc-800/50 rounded-lg animate-pulse" />
            </div>
          ))}
          <div className="h-10 bg-brand-gold/30 rounded-lg animate-pulse mt-4" />
        </div>
      </div>
    </div>
  );
}
