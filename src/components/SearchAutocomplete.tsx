"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

type VenueResult = { id: string; name: string; city: string; state: string };
type ComedianResult = {
  id: string;
  name: string;
  slug: string;
  headshotUrl: string | null;
};

type SearchResults = {
  venues: VenueResult[];
  comedians: ComedianResult[];
  events: Array<unknown>;
};

type Props = {
  /** Which entity type to show suggestions for */
  type: "venue" | "comedian";
  /** Form field name attribute */
  name: string;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
};

export function SearchAutocomplete({
  type,
  name,
  placeholder,
  defaultValue = "",
  className = "",
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions with debounce
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&take=6`,
          { signal: ctrl.signal }
        );
        const data: SearchResults = await res.json();
        setResults(data);
        setOpen(true);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setResults(null);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // Build options list based on entity type
  const items = useMemo(() => {
    if (!results) return [];
    if (type === "venue") {
      return results.venues.map((v) => ({
        id: v.id,
        href: `/venues/${v.id}`,
        label: v.name,
        sublabel: `${v.city}, ${v.state}`,
      }));
    }
    return results.comedians.map((c) => ({
      id: c.id,
      href: `/comedians/${c.slug}`,
      label: c.name,
      sublabel: null as string | null,
      headshotUrl: c.headshotUrl,
    }));
  }, [results, type]);

  const hasItems = items.length > 0;
  const isEmpty = results && !hasItems && query.trim().length >= 2 && !loading;

  // Reset active index when items change
  useEffect(() => {
    setActiveIndex((i) => (i >= items.length ? -1 : i));
  }, [items.length]);

  // Scroll active option into view
  useEffect(() => {
    if (activeIndex >= 0 && open) {
      document
        .getElementById(`autocomplete-option-${type}-${activeIndex}`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeIndex, open, type]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (
        !open &&
        hasItems &&
        (e.key === "ArrowDown" || e.key === "ArrowUp")
      ) {
        e.preventDefault();
        setOpen(true);
        setActiveIndex(e.key === "ArrowDown" ? 0 : items.length - 1);
        return;
      }
      if (!open || !hasItems) {
        if (e.key === "Escape") setOpen(false);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        setActiveIndex(-1);
        inputRef.current?.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i < items.length - 1 ? i + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
      } else if (e.key === "Enter" && activeIndex >= 0 && items[activeIndex]) {
        e.preventDefault();
        router.push(items[activeIndex].href);
        setOpen(false);
        setActiveIndex(-1);
      }
      // If Enter is pressed without an active selection, the form submits normally
    },
    [open, hasItems, activeIndex, items, router]
  );

  const listboxId = `autocomplete-listbox-${type}`;

  return (
    <div ref={containerRef} className="relative flex-1 min-w-[200px]">
      <label htmlFor={`autocomplete-${type}`} className="sr-only">
        Search
      </label>
      <input
        id={`autocomplete-${type}`}
        ref={inputRef}
        name={name}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results && hasItems && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={!!(open && (loading || hasItems || isEmpty))}
        aria-haspopup="listbox"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-activedescendant={
          activeIndex >= 0 && activeIndex < items.length
            ? `autocomplete-option-${type}-${activeIndex}`
            : undefined
        }
        autoComplete="off"
        className={className}
      />
      {open && (loading || hasItems || isEmpty) && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 py-1 rounded-lg bg-brand-surface border border-zinc-700 shadow-xl z-50 max-h-64 overflow-y-auto"
        >
          {loading && !hasItems && (
            <div className="px-4 py-3 text-center text-zinc-500 text-sm">
              Searching…
            </div>
          )}
          {hasItems && (
            <ul>
              {items.map((item, i) => {
                const isActive = i === activeIndex;
                return (
                  <li key={item.id}>
                    <Link
                      id={`autocomplete-option-${type}-${i}`}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`flex items-center gap-3 px-4 py-2 hover:bg-zinc-800 ${isActive ? "bg-zinc-800" : ""}`}
                      role="option"
                      aria-selected={isActive}
                    >
                      {type === "comedian" &&
                        "headshotUrl" in item &&
                        (item as { headshotUrl: string | null }).headshotUrl ? (
                        <Image
                          src={
                            (item as { headshotUrl: string }).headshotUrl
                          }
                          alt={item.label}
                          width={28}
                          height={28}
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                      ) : type === "comedian" ? (
                        <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-400 shrink-0">
                          {item.label.charAt(0)}
                        </div>
                      ) : null}
                      <div className="min-w-0">
                        <span className="text-white text-sm font-medium block truncate">
                          {item.label}
                        </span>
                        {item.sublabel && (
                          <span className="text-zinc-500 text-xs block truncate">
                            {item.sublabel}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {!loading && isEmpty && (
            <div className="px-4 py-3 text-center text-zinc-500 text-sm">
              No {type === "venue" ? "venues" : "comedians"} found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
