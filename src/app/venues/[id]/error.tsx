"use client";

import Link from "next/link";

export default function VenueError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-white mb-2">Venue not found</h1>
        <p className="text-zinc-400 mb-8">
          {error.message || "This venue may have been removed or the link is invalid."}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-medium hover:bg-brand-gold/90 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-lg bg-brand-charcoal border border-zinc-700 text-zinc-300 font-medium hover:bg-zinc-800 transition-colors"
          >
            Go home
          </Link>
          <Link
            href="/venues"
            className="px-5 py-2.5 rounded-lg bg-brand-charcoal border border-zinc-700 text-zinc-300 font-medium hover:bg-zinc-800 transition-colors"
          >
            Browse venues
          </Link>
        </div>
      </div>
    </main>
  );
}
