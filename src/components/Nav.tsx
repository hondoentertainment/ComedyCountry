"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchBar } from "./SearchBar";
import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { NotificationBell } from "./NotificationBell";
import { logger } from "@/lib/logger";

const navItems = [
  { href: "/", label: "Discover" },
  { href: "/venues", label: "Venues" },
  { href: "/comedians", label: "Comedians" },
  { href: "/schedule", label: "Schedule" },
  { href: "/happening-tonight", label: "Tonight" },
  { href: "/trending", label: "Trending" },
  { href: "/specials", label: "Specials" },
  { href: "/lists", label: "Lists" },
  { href: "/news", label: "News" },
];

const moreItems = [
  { href: "/map", label: "Map" },
  { href: "/following", label: "Following" },
  { href: "/tickets", label: "My Tickets" },
  { href: "/taste-profile", label: "Taste Profile" },
  { href: "/friends", label: "Friends" },
  { href: "/discussions", label: "Discussions" },
  { href: "/clips", label: "Clips" },
  { href: "/fan-clubs", label: "Fan Clubs" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/creator", label: "Creator Hub" },
  { href: "/industry", label: "Industry" },
  { href: "/open-mics", label: "Open Mics" },
  { href: "/festivals", label: "Festivals" },
  { href: "/podcasts", label: "Podcasts" },
  { href: "/compare", label: "Compare" },
  { href: "/wrapped", label: "Wrapped" },
  { href: "/for-you", label: "For You" },
  { href: "/pricing", label: "Pricing" },
];

function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function Nav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tonightCount, setTonightCount] = useState<number | null>(null);
  const { data: session, status } = useSession();
  const mobileMenuRef = useFocusTrap(mobileOpen);

  useEffect(() => {
    fetch("/api/happening-tonight")
      .then((r) => r.json())
      .then((data) => setTonightCount((data.events ?? []).length))
      .catch((err) => {
        logger.error(
          "Nav tonight count fetch failed",
          {},
          err instanceof Error ? err : undefined,
        );
      });
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    if (mobileOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [mobileOpen]);

  return (
    <nav className="border-b border-zinc-800/80 bg-brand-dark/98 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between">
          <Link
            href="/"
            className="text-lg font-bold text-white hover:text-brand-gold transition-colors duration-150 shrink-0"
          >
            Punchline Atlas
          </Link>

          <div className="hidden md:block flex-1 max-w-xs mx-4">
            <SearchBar />
          </div>

          {/* Mobile search — prominent icon linking to /search */}
          <Link
            href="/search"
            className="md:hidden flex items-center justify-center min-w-[44px] min-h-[44px] -m-2 rounded-lg text-zinc-400 hover:text-brand-gold hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:ring-offset-2 focus:ring-offset-brand-dark"
            aria-label="Search venues, comedians, and events"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </Link>

          {/* Desktop nav — Spotify-style minimal */}
          <div className="hidden md:flex items-center gap-1 shrink-0">
            <ul className="flex gap-0.5">
              {navItems.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={isActive(href, pathname) ? "page" : undefined}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:ring-offset-2 focus:ring-offset-brand-dark ${
                      href === "/happening-tonight" &&
                      tonightCount != null &&
                      tonightCount > 0
                        ? "text-brand-gold hover:text-brand-gold/90 hover:bg-brand-gold/10"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {label}
                    {href === "/happening-tonight" &&
                      tonightCount != null &&
                      tonightCount > 0 && (
                        <span
                          className="px-1.5 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold text-xs font-semibold"
                          aria-label={`${tonightCount} shows tonight`}
                        >
                          {tonightCount}
                        </span>
                      )}
                  </Link>
                </li>
              ))}
              <li className="relative group">
                <button
                  type="button"
                  className="block px-4 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 text-sm font-medium transition-all duration-150"
                >
                  More
                </button>
                <div className="absolute right-0 top-full mt-1 w-48 py-2 bg-brand-surface border border-zinc-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all z-50">
                  {moreItems.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className="block px-4 py-2 text-zinc-400 hover:text-white hover:bg-white/5 text-sm"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </li>
            </ul>
            <div className="ml-2 pl-2 border-l border-zinc-700/80 flex items-center gap-1">
              {status === "loading" ? (
                <span className="text-zinc-500 text-sm">…</span>
              ) : session ? (
                <>
                  <NotificationBell />
                  {(session.user as { role?: string }).role === "admin" && (
                    <Link
                      href="/admin"
                      className="px-4 py-2 rounded-lg text-brand-gold hover:text-brand-gold/80 hover:bg-brand-gold/10 text-sm font-medium transition-all duration-150"
                    >
                      Admin
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    aria-current={pathname === "/profile" ? "page" : undefined}
                    className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:ring-offset-2 focus:ring-offset-brand-dark"
                  >
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    aria-current={pathname === "/settings" ? "page" : undefined}
                    className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:ring-offset-2 focus:ring-offset-brand-dark"
                  >
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="px-4 py-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:ring-offset-2 focus:ring-offset-brand-dark"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  href="/auth/signin"
                  className="block px-4 py-2 rounded-lg bg-brand-gold text-brand-dark hover:bg-brand-gold/90 text-sm font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 focus:ring-offset-brand-dark"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>

          {/* Mobile menu button — shown with search icon */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:ring-offset-2 focus:ring-offset-brand-dark"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div
            ref={mobileMenuRef}
            className="md:hidden border-t border-zinc-800/80 py-4 bg-brand-surface/95"
          >
            <div className="px-4 pb-3">
              <SearchBar />
            </div>
            <ul className="flex flex-col gap-0.5">
              {[...navItems, ...moreItems].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={isActive(href, pathname) ? "page" : undefined}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:ring-offset-2 focus:ring-offset-brand-dark ${
                      href === "/happening-tonight" &&
                      tonightCount != null &&
                      tonightCount > 0
                        ? "text-brand-gold hover:text-brand-gold/90 hover:bg-brand-gold/10"
                        : "text-zinc-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {label}
                    {href === "/happening-tonight" &&
                      tonightCount != null &&
                      tonightCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold text-xs font-semibold">
                          {tonightCount}
                        </span>
                      )}
                  </Link>
                </li>
              ))}
              <li className="border-t border-zinc-800 mt-2 pt-2 space-y-0.5">
                {session ? (
                  <>
                    {(session.user as { role?: string }).role === "admin" && (
                      <Link
                        href="/admin"
                        onClick={() => setMobileOpen(false)}
                        className="block px-4 py-3 rounded-lg text-brand-gold hover:bg-brand-gold/10 text-base font-medium transition-colors"
                      >
                        Admin
                      </Link>
                    )}
                    <Link
                      href="/profile"
                      aria-current={
                        pathname === "/profile" ? "page" : undefined
                      }
                      onClick={() => setMobileOpen(false)}
                      className="block px-4 py-3 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:ring-offset-2 focus:ring-offset-brand-dark"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      aria-current={
                        pathname === "/settings" ? "page" : undefined
                      }
                      onClick={() => setMobileOpen(false)}
                      className="block px-4 py-3 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:ring-offset-2 focus:ring-offset-brand-dark"
                    >
                      Settings
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="block w-full text-left px-4 py-3 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:ring-offset-2 focus:ring-offset-brand-dark"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <Link
                    href="/auth/signin"
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-3 rounded-lg bg-brand-gold text-brand-dark hover:bg-brand-gold/90 text-base font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 focus:ring-offset-brand-dark"
                  >
                    Sign in
                  </Link>
                )}
              </li>
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
}
