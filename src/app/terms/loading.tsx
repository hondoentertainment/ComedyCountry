export default function TermsLoading() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="h-9 w-44 bg-zinc-700 rounded animate-pulse mb-8" />
        <div className="space-y-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-4 bg-zinc-800 rounded animate-pulse" style={{ width: `${70 + Math.random() * 30}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
