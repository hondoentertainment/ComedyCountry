export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 animate-pulse">
      <div className="h-8 bg-zinc-800 rounded w-36 mb-2" />
      <div className="h-4 bg-zinc-800 rounded w-64 mb-10" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-14">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square bg-zinc-800 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
