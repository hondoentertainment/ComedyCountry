export default function TouringGuideLoading() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="h-9 w-48 bg-zinc-700 rounded animate-pulse mb-2" />
        <div className="h-5 w-80 bg-zinc-800 rounded animate-pulse mb-8" />
        <div className="space-y-6">
          {[...Array(5)].map((_, i) => (
            <div key={i}>
              <div className="h-6 w-40 bg-zinc-700 rounded animate-pulse mb-3" />
              <div className="h-4 w-full bg-zinc-800 rounded animate-pulse mb-2" />
              <div className="h-4 w-5/6 bg-zinc-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
