"use client";

import Link from "next/link";
import { useCookieConsent } from "@/components/CookieConsent";

export function Footer() {
  const { openPreferences } = useCookieConsent();

  return (
    <footer className="mt-auto border-t border-zinc-800 bg-brand-charcoal/50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm text-zinc-500">
            © {new Date().getFullYear()} Punchline Atlas. All rights reserved.
          </p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Legal">
            <Link
              href="/terms"
              className="text-sm text-zinc-400 hover:text-brand-gold transition-colors"
            >
              Terms & Conditions
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-zinc-400 hover:text-brand-gold transition-colors"
            >
              Privacy Policy
            </Link>
            <button
              type="button"
              onClick={openPreferences}
              className="text-sm text-zinc-400 hover:text-brand-gold transition-colors text-left"
            >
              Cookie preferences
            </button>
          </nav>
        </div>
      </div>
    </footer>
  );
}
