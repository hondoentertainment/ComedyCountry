export default function ClipsFeedLoading() {
  return (
    <main className="min-h-screen">
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-9 w-32 bg-zinc-700 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-[9/16] rounded-lg bg-zinc-800 animate-pulse" />
          ))}
        </div>
      </div>
    </main>
  );
}
