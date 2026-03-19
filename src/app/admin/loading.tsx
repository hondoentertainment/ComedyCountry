export default function AdminLoading() {
  return (
    <div className="md:mt-0 mt-12">
      <div className="h-8 w-32 bg-zinc-700 rounded animate-pulse mb-6" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="p-4 rounded-lg bg-brand-surface border border-zinc-800">
            <div className="h-8 w-16 bg-zinc-700 rounded animate-pulse mb-2" />
            <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
