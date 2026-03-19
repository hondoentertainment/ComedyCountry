export default function AdminReportsLoading() {
  return (
    <div>
      <div className="h-8 w-28 bg-zinc-700 rounded animate-pulse mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-48 rounded-lg bg-zinc-800/50 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
