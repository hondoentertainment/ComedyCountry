export default function TicketScanLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-64 h-64 bg-zinc-800 rounded-lg animate-pulse mx-auto mb-4" />
        <div className="h-5 w-40 bg-zinc-700 rounded animate-pulse mx-auto" />
      </div>
    </div>
  );
}
