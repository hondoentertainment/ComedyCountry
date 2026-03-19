export default function SignUpLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm p-6">
        <div className="h-8 w-28 bg-zinc-700 rounded animate-pulse mx-auto mb-8" />
        <div className="space-y-4">
          <div className="h-10 bg-zinc-800 rounded-lg animate-pulse" />
          <div className="h-10 bg-zinc-800 rounded-lg animate-pulse" />
          <div className="h-10 bg-zinc-800 rounded-lg animate-pulse" />
          <div className="h-10 bg-brand-gold/30 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}
