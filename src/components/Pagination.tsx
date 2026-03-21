"use client";

import Link from "next/link";
import { PAGE_SIZE } from "@/lib/constants";

type PaginationProps = {
  total: number;
  currentPage: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
};

export function Pagination({
  total,
  currentPage,
  basePath,
  searchParams,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (totalPages <= 1) return null;

  const makeUrl = (page: number) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([k, v]) => {
      if (v != null && v !== "" && k !== "page") params.set(k, v);
    });
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const prevPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;

  const start = (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(currentPage * PAGE_SIZE, total);

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-4 py-6 border-t border-zinc-800"
      aria-label="Pagination"
    >
      <p className="text-sm text-zinc-500">
        Showing <span className="font-medium text-zinc-400">{start}</span>–
        <span className="font-medium text-zinc-400">{end}</span> of{" "}
        <span className="font-medium text-zinc-400">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        {prevPage ? (
          <Link
            href={makeUrl(prevPage)}
            className="px-4 py-2 rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white text-sm font-medium transition-colors"
          >
            Previous
          </Link>
        ) : (
          <button
            disabled
            className="px-4 py-2 rounded-md bg-zinc-800/50 text-zinc-600 text-sm font-medium opacity-50 cursor-not-allowed"
            aria-disabled="true"
          >
            Previous
          </button>
        )}
        <span className="text-zinc-500 text-sm px-2">
          Page {currentPage} of {totalPages}
        </span>
        {nextPage ? (
          <Link
            href={makeUrl(nextPage)}
            className="px-4 py-2 rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white text-sm font-medium transition-colors"
          >
            Next
          </Link>
        ) : (
          <button
            disabled
            className="px-4 py-2 rounded-md bg-zinc-800/50 text-zinc-600 text-sm font-medium opacity-50 cursor-not-allowed"
            aria-disabled="true"
          >
            Next
          </button>
        )}
      </div>
    </nav>
  );
}

