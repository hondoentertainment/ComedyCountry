export default function NewsArticleLoading() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse mb-6" />
        <div className="h-10 w-full bg-zinc-700 rounded animate-pulse mb-4" />
        <div className="flex items-center gap-3 mb-8">
          <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
          <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="aspect-video rounded-lg bg-zinc-700 animate-pulse mb-8" />
        <div className="space-y-3">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-4 bg-zinc-800 rounded animate-pulse" style={{ width: `${75 + Math.random() * 25}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
