export default function DiscussionLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mb-6" />
      <div className="p-6 rounded-lg bg-brand-surface border border-zinc-800 mb-6">
        <div className="h-7 w-80 bg-zinc-700 rounded animate-pulse mb-3" />
        <div className="space-y-2 mb-4">
          <div className="h-4 w-full bg-zinc-800 rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-zinc-800 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="flex gap-3">
          <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
          <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
        </div>
      </div>
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-zinc-800/50 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
