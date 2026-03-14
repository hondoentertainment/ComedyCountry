"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-white mb-4">Something went wrong</h1>
      <p className="text-zinc-400 mb-6">We couldn&apos;t load specials. Please try again.</p>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90"
      >
        Try again
      </button>
    </div>
  );
}
