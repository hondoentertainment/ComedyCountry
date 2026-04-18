"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface UseSearchDropdownOptions<T> {
  fetchFn: (query: string, signal: AbortSignal) => Promise<T>;
  debounceMs?: number;
  minChars?: number;
  initialQuery?: string;
  fetchOnFocus?: boolean;
}

export interface UseSearchDropdownReturn<T> {
  query: string;
  setQuery: (q: string) => void;
  data: T | null;
  loading: boolean;
  open: boolean;
  setOpen: (o: boolean) => void;
  activeIndex: number;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  handleKeyDown: (
    e: React.KeyboardEvent,
    optionCount: number,
    onSelect: (index: number) => void,
  ) => void;
  handleFocus: () => void;
}

export function useSearchDropdown<T>({
  fetchFn,
  debounceMs = 200,
  minChars = 2,
  initialQuery = "",
  fetchOnFocus = false,
}: UseSearchDropdownOptions<T>): UseSearchDropdownReturn<T> {
  const [query, setQuery] = useState(initialQuery);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const hasFetchedPopular = useRef(false);
  const cacheRef = useRef<Map<string, T>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.trim().length < minChars) {
      if (query.trim().length > 0) {
        setData(null);
        setOpen(false);
      }
      return;
    }
    const cacheKey = query.trim().toLowerCase();
    const cached = cacheRef.current.get(cacheKey);
    if (cached !== undefined) {
      setData(cached);
      setOpen(true);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await fetchFn(query, ctrl.signal);
        const cache = cacheRef.current;
        if (cache.size >= 50) {
          const oldest = cache.keys().next().value!;
          cache.delete(oldest);
        }
        cache.set(cacheKey, result);
        setData(result);
        setOpen(true);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setData(null);
      } finally {
        setLoading(false);
      }
    }, debounceMs);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, fetchFn, debounceMs, minChars]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  useEffect(() => {
    if (activeIndex >= 0 && open) {
      document
        .getElementById(`search-dropdown-option-${activeIndex}`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeIndex, open]);

  const handleFocus = useCallback(() => {
    if (data) {
      setOpen(true);
      return;
    }
    if (!fetchOnFocus || hasFetchedPopular.current || query.trim().length >= minChars) return;
    const cacheKey = "";
    const cached = cacheRef.current.get(cacheKey);
    if (cached !== undefined) {
      setData(cached);
      setOpen(true);
      return;
    }
    hasFetchedPopular.current = true;
    const ctrl = new AbortController();
    setLoading(true);
    fetchFn("", ctrl.signal)
      .then((result) => {
        const cache = cacheRef.current;
        if (cache.size >= 50) {
          const oldest = cache.keys().next().value!;
          cache.delete(oldest);
        }
        cache.set(cacheKey, result);
        setData(result);
        setOpen(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [data, fetchOnFocus, fetchFn, query, minChars]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, optionCount: number, onSelect: (index: number) => void) => {
      if (!open && optionCount > 0 && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault();
        setOpen(true);
        setActiveIndex(e.key === "ArrowDown" ? 0 : optionCount - 1);
        return;
      }
      if (!open || optionCount === 0) {
        if (e.key === "Escape") setOpen(false);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        setActiveIndex(-1);
        inputRef.current?.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i < optionCount - 1 ? i + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? optionCount - 1 : i - 1));
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        onSelect(activeIndex);
        setOpen(false);
        setActiveIndex(-1);
      }
    },
    [open, activeIndex],
  );

  return {
    query,
    setQuery,
    data,
    loading,
    open,
    setOpen,
    activeIndex,
    setActiveIndex,
    containerRef,
    inputRef,
    handleKeyDown,
    handleFocus,
  };
}
