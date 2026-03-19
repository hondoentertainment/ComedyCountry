export default function AdminClaimsLoading() {
  return (
    <div>
      <div className="h-8 w-40 bg-zinc-700 rounded animate-pulse mb-6" />
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-zinc-800/50 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
