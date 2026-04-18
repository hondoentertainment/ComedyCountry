"use client";

import { useCallback, useMemo, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useSearchDropdown } from "@/hooks/useSearchDropdown";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { HighlightMatch } from "./HighlightMatch";
import type { AutocompleteVenue, AutocompleteComedian } from "@/lib/search";

type Props = {
  type: "venue" | "comedian";
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
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get(name) ?? defaultValue;

  const fetchFn = useCallback(
    async (q: string, signal: AbortSignal) => {
      const qs = q ? `&q=${encodeURIComponent(q)}` : "";
      const res = await fetch(`/api/autocomplete?type=${type}${qs}&take=6`, { signal });
      return res.json() as Promise<AutocompleteVenue[] | AutocompleteComedian[]>;
    },
    [type],
  );

  const {
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
    handleKeyDown: baseHandleKeyDown,
    handleFocus,
  } = useSearchDropdown<AutocompleteVenue[] | AutocompleteComedian[]>({
    fetchFn,
    initialQuery,
    fetchOnFocus: true,
  });

  const { recentSearches, addRecentSearch, clearRecentSearches } =
    useRecentSearches(type);

  const isPopular = query.trim().length < 2;

  const items = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return [];
    if (type === "venue") {
      return (data as AutocompleteVenue[]).map((v) => ({
        id: v.id,
        label: v.name,
        sublabel: `${v.city}, ${v.state}`,
        headshotUrl: null as string | null,
      }));
    }
    return (data as AutocompleteComedian[]).map((c) => ({
      id: c.id,
      label: c.name,
      sublabel: null as string | null,
      headshotUrl: c.headshotUrl,
    }));
  }, [data, type]);

  const hasItems = items.length > 0;
  const isEmpty =
    data && Array.isArray(data) && data.length === 0 && query.trim().length >= 2 && !loading;

  useEffect(() => {
    setActiveIndex((i) => (i >= items.length ? -1 : i));
  }, [items.length, setActiveIndex]);

  const submitFilter = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      params.delete("page");
      const basePath = type === "venue" ? "/venues" : "/comedians";
      router.push(`${basePath}?${params.toString()}`, { scroll: false });
    },
    [searchParams, name, type, router],
  );

  const onSelect = useCallback(
    (index: number) => {
      if (items[index]) {
        setQuery(items[index].label);
        submitFilter(items[index].label);
        addRecentSearch(items[index].label);
      }
    },
    [items, setQuery, submitFilter, addRecentSearch],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => baseHandleKeyDown(e, items.length, onSelect),
    [baseHandleKeyDown, items.length, onSelect],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
    },
    [setQuery],
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
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={!!(open && (loading || hasItems || isEmpty))}
        aria-haspopup="listbox"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-activedescendant={
          activeIndex >= 0 && activeIndex < items.length
            ? `search-dropdown-option-${activeIndex}`
            : undefined
        }
        autoComplete="off"
        className={className}
      />
      {open && (loading || hasItems || isEmpty || (isPopular && recentSearches.length > 0)) && (
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
          {isPopular && recentSearches.length > 0 && (
            <div>
              <div className="px-4 py-1 flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-600">Recent</span>
                <button
                  type="button"
                  onClick={() => clearRecentSearches()}
                  className="text-xs text-zinc-600 hover:text-zinc-400"
                >
                  Clear
                </button>
              </div>
              <ul>
                {recentSearches.map((term) => (
                  <li key={term}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        setQuery(term);
                        submitFilter(term);
                      }}
                      className="flex items-center gap-3 px-4 py-2 w-full text-left hover:bg-zinc-800"
                    >
                      <svg
                        className="w-4 h-4 text-zinc-500 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="text-white text-sm font-medium truncate">
                        {term}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {hasItems && (
            <>
              {isPopular && (
                <div className="px-4 py-1 text-xs font-medium text-zinc-600">
                  Popular {type === "venue" ? "venues" : "comedians"}
                </div>
              )}
              <ul>
                {items.map((item, i) => {
                  const isActive = i === activeIndex;
                  return (
                    <li key={item.id}>
                      <button
                        id={`search-dropdown-option-${i}`}
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          setQuery(item.label);
                          submitFilter(item.label);
                          addRecentSearch(item.label);
                        }}
                        onMouseEnter={() => setActiveIndex(i)}
                        className={`flex items-center gap-3 px-4 py-2 w-full text-left hover:bg-zinc-800 ${isActive ? "bg-zinc-800" : ""}`}
                        role="option"
                        aria-selected={isActive}
                      >
                        {type === "comedian" && item.headshotUrl ? (
                          <Image
                            src={item.headshotUrl}
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
                            <HighlightMatch text={item.label} query={query} />
                          </span>
                          {item.sublabel && (
                            <span className="text-zinc-500 text-xs block truncate">
                              {item.sublabel}
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
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
