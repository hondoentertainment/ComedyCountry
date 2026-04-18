"use client";

import { useState, useCallback } from "react";

const MAX_RECENT = 5;

function getStorageKey(key: string) {
  return `recent-searches-${key}`;
}

function readFromStorage(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getStorageKey(key));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeToStorage(key: string, searches: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getStorageKey(key), JSON.stringify(searches));
  } catch {
    // localStorage may be full or unavailable
  }
}

export function useRecentSearches(key: string) {
  const [recentSearches, setRecentSearches] = useState<string[]>(() =>
    readFromStorage(key),
  );

  const addRecentSearch = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;

      setRecentSearches((prev) => {
        // Remove duplicates (case-insensitive)
        const filtered = prev.filter(
          (s) => s.toLowerCase() !== trimmed.toLowerCase(),
        );
        // Add to front, keep max
        const next = [trimmed, ...filtered].slice(0, MAX_RECENT);
        writeToStorage(key, next);
        return next;
      });
    },
    [key],
  );

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    writeToStorage(key, []);
  }, [key]);

  return { recentSearches, addRecentSearch, clearRecentSearches };
}
