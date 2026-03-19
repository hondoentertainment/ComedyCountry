export default function TasteProfileLoading() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="h-9 w-40 bg-zinc-700 rounded animate-pulse mb-2" />
        <div className="h-5 w-72 bg-zinc-800 rounded animate-pulse mb-8" />
        <div className="space-y-6">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <div className="h-5 w-32 bg-zinc-700 rounded animate-pulse mb-3" />
              <div className="flex flex-wrap gap-2">
                {[...Array(6)].map((_, j) => (
                  <div key={j} className="h-10 w-24 bg-zinc-800 rounded-full animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
