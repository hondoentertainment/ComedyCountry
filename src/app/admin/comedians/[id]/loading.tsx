export default function AdminComedianEditLoading() {
  return (
    <div>
      <div className="h-8 w-40 bg-zinc-700 rounded animate-pulse mb-6" />
      <div className="space-y-4 max-w-2xl">
        {[...Array(6)].map((_, i) => (
          <div key={i}>
            <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mb-2" />
            <div className="h-10 bg-zinc-800/50 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
