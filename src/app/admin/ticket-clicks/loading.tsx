export default function AdminTicketClicksLoading() {
  return (
    <div>
      <div className="h-8 w-36 bg-zinc-700 rounded animate-pulse mb-6" />
      <div className="space-y-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-zinc-800/50 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
