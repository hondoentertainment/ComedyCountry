"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Clears all comedian filters (status, genre, search, page) by navigating to /comedians
 * without any query params. Using a client-side navigation ensures the URL is
 * definitively reset.
 */
export function ClearComediansFiltersLink() {
  const router = useRouter();
  return (
    <Link
      href="/comedians"
      onClick={(e) => {
        e.preventDefault();
        router.replace("/comedians");
      }}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-gold text-brand-dark font-semibold hover:bg-brand-gold/90 transition-colors"
    >
      Clear filters
    </Link>
  );
}
