export default function WrappedLoading() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="h-9 w-48 bg-zinc-700 rounded animate-pulse mb-2" />
        <div className="h-5 w-64 bg-zinc-800 rounded animate-pulse mb-8" />
        <div className="space-y-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-zinc-800/50 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
