"use client";

import { useState, useCallback, useMemo } from "react";

interface UsePaginationOptions {
  totalItems: number;
  itemsPerPage?: number;
  initialPage?: number;
}

interface UsePaginationReturn {
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  startIndex: number;
  endIndex: number;
}

export function usePagination({ totalItems, itemsPerPage = 10, initialPage = 1 }: UsePaginationOptions): UsePaginationReturn {
  const [page, setPage] = useState(initialPage);

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  const nextPage = useCallback(() => {
    setPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(p - 1, 1));
  }, []);

  const goToPage = useCallback((target: number) => {
    setPage(Math.max(1, Math.min(target, totalPages)));
  }, [totalPages]);

  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  return useMemo(() => ({
    page, totalPages, hasNextPage, hasPrevPage, nextPage, prevPage, goToPage, startIndex, endIndex,
  }), [page, totalPages, hasNextPage, hasPrevPage, nextPage, prevPage, goToPage, startIndex, endIndex]);
}
