export default function OfflineLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="h-16 w-16 bg-zinc-700 rounded-full animate-pulse mx-auto mb-4" />
        <div className="h-7 w-32 bg-zinc-700 rounded animate-pulse mx-auto mb-2" />
        <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse mx-auto" />
      </div>
    </div>
  );
}
