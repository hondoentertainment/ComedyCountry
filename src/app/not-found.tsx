import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-brand-gold mb-2">404</h1>
        <h2 className="text-xl font-semibold text-white mb-2">Page not found</h2>
        <p className="text-zinc-400 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-medium hover:bg-brand-gold/90 transition-colors"
          >
            Go home
          </Link>
          <Link
            href="/venues"
            className="px-5 py-2.5 rounded-lg bg-brand-charcoal border border-zinc-700 text-zinc-300 font-medium hover:bg-zinc-800 transition-colors"
          >
            Browse venues
          </Link>
          <Link
            href="/comedians"
            className="px-5 py-2.5 rounded-lg bg-brand-charcoal border border-zinc-700 text-zinc-300 font-medium hover:bg-zinc-800 transition-colors"
          >
            Browse comedians
          </Link>
          <Link
            href="/schedule"
            className="px-5 py-2.5 rounded-lg bg-brand-charcoal border border-zinc-700 text-zinc-300 font-medium hover:bg-zinc-800 transition-colors"
          >
            View schedule
          </Link>
        </div>
      </div>
    </main>
  );
}
