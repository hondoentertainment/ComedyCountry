export default function VenueOpsLoading() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="h-9 w-48 bg-zinc-700 rounded animate-pulse mb-2" />
        <div className="h-5 w-72 bg-zinc-800 rounded animate-pulse mb-8" />
        <div className="flex gap-2 mb-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 w-24 bg-zinc-800 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-96 rounded-lg bg-zinc-800/50 animate-pulse" />
      </div>
    </div>
  );
}
