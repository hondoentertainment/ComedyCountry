export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 animate-pulse">
      <div className="h-8 bg-zinc-800 rounded w-52 mb-2" />
      <div className="h-4 bg-zinc-800 rounded w-80 mb-10" />
      <div className="space-y-3 mb-14">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-zinc-800 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 bg-zinc-800 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
