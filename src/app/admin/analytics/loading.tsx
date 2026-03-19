export default function AdminAnalyticsLoading() {
  return (
    <div>
      <div className="h-8 w-32 bg-zinc-700 rounded animate-pulse mb-6" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-zinc-800/50 animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-lg bg-zinc-800/50 animate-pulse" />
    </div>
  );
}
