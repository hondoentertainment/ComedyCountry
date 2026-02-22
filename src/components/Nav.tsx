"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";

const navItems = [
  { href: "/", label: "Discover" },
  { href: "/venues", label: "Venues" },
  { href: "/comedians", label: "Comedians" },
  { href: "/schedule", label: "Schedule" },
  { href: "/map", label: "Map" },
  { href: "/following", label: "Following" },
];

export function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session, status } = useSession();

  return (
    <nav className="border-b border-zinc-800 bg-brand-dark/95 backdrop-blur supports-[backdrop-filter]:bg-brand-dark/80 sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold text-brand-gold hover:text-brand-gold/90 transition-colors"
          >
            Punchline Atlas
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-2">
            <ul className="flex gap-1 sm:gap-2">
              {navItems.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="block px-3 py-2 rounded-md text-zinc-300 hover:text-white hover:bg-zinc-800/50 text-sm font-medium transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="ml-4 pl-4 border-l border-zinc-700 flex items-center gap-1">
              {status === "loading" ? (
                <span className="text-zinc-500 text-sm">…</span>
              ) : session ? (
                <>
                  <Link
                    href="/profile"
                    className="px-3 py-2 rounded-md text-zinc-300 hover:text-white hover:bg-zinc-800/50 text-sm font-medium transition-colors"
                  >
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="px-3 py-2 rounded-md text-zinc-300 hover:text-white hover:bg-zinc-800/50 text-sm font-medium transition-colors"
                  >
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="px-3 py-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800/50 text-sm font-medium transition-colors"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  href="/auth/signin"
                  className="block px-3 py-2 rounded-md text-zinc-300 hover:text-white hover:bg-zinc-800/50 text-sm font-medium transition-colors"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
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
          <div className="md:hidden border-t border-zinc-800 py-4">
            <ul className="flex flex-col gap-1">
              {navItems.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-3 rounded-md text-zinc-300 hover:text-white hover:bg-zinc-800/50 text-base font-medium transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
              <li className="border-t border-zinc-800 mt-2 pt-2 space-y-1">
                {session ? (
                  <>
                    <Link
                      href="/profile"
                      onClick={() => setMobileOpen(false)}
                      className="block px-4 py-3 rounded-md text-zinc-300 hover:text-white hover:bg-zinc-800/50 text-base font-medium transition-colors"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setMobileOpen(false)}
                      className="block px-4 py-3 rounded-md text-zinc-300 hover:text-white hover:bg-zinc-800/50 text-base font-medium transition-colors"
                    >
                      Settings
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="block w-full text-left px-4 py-3 rounded-md text-zinc-300 hover:text-white hover:bg-zinc-800/50 text-base font-medium transition-colors"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <Link
                    href="/auth/signin"
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-3 rounded-md text-zinc-300 hover:text-white hover:bg-zinc-800/50 text-base font-medium transition-colors"
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
