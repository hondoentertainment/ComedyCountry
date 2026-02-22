export default function MapLoading() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="h-9 w-32 bg-zinc-700 rounded animate-pulse mb-2" />
        <div className="h-5 w-80 bg-zinc-800 rounded animate-pulse mb-6" />
        <div className="aspect-video w-full rounded-lg bg-zinc-800 animate-pulse" />
      </div>
    </main>
  );
}
