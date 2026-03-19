export default function TicketDetailLoading() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mb-6" />
        <div className="rounded-card bg-brand-surface border border-zinc-800/80 p-6">
          <div className="h-7 w-56 bg-zinc-700 rounded animate-pulse mb-2" />
          <div className="h-5 w-32 bg-zinc-800 rounded animate-pulse mb-6" />
          <div className="w-48 h-48 mx-auto bg-zinc-700 rounded-lg animate-pulse mb-6" />
          <div className="space-y-3">
            <div className="h-4 w-full bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
