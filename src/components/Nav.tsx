"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchBar } from "./SearchBar";
import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

const navItems = [
  { href: "/", label: "Discover" },
  { href: "/venues", label: "Venues" },
  { href: "/comedians", label: "Comedians" },
  { href: "/schedule", label: "Schedule" },
  { href: "/map", label: "Map" },
  { href: "/following", label: "Following" },
];

function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function Nav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session, status } = useSession();
  const mobileMenuRef = useFocusTrap(mobileOpen);

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

          {/* Mobile search icon — navigates to /search */}
          <Link
            href="/search"
            className="md:hidden p-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Search"
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
                    className="block px-4 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:ring-offset-2 focus:ring-offset-brand-dark"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="ml-2 pl-2 border-l border-zinc-700/80 flex items-center gap-1">
              {status === "loading" ? (
                <span className="text-zinc-500 text-sm">…</span>
              ) : session ? (
                <>
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
                    className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 text-sm font-medium transition-all duration-150"
                  >
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 text-sm font-medium transition-all duration-150"
                  >
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="px-4 py-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 text-sm font-medium transition-all duration-150"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  href="/auth/signin"
                  className="block px-4 py-2 rounded-lg bg-brand-gold text-brand-dark hover:bg-brand-gold/90 text-sm font-semibold transition-all duration-150"
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
            className="md:hidden p-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
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
              {navItems.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={isActive(href, pathname) ? "page" : undefined}
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-3 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 text-base font-medium transition-colors"
                  >
                    {label}
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
                      onClick={() => setMobileOpen(false)}
                      className="block px-4 py-3 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 text-base font-medium transition-colors"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setMobileOpen(false)}
                      className="block px-4 py-3 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 text-base font-medium transition-colors"
                    >
                      Settings
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="block w-full text-left px-4 py-3 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 text-base font-medium transition-colors"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <Link
                    href="/auth/signin"
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-3 rounded-lg bg-brand-gold text-brand-dark hover:bg-brand-gold/90 text-base font-semibold transition-colors"
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
