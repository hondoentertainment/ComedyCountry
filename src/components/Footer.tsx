"use client";

import Link from "next/link";
import { useCookieConsent } from "@/components/CookieConsent";

export function Footer() {
  const { openPreferences } = useCookieConsent();

  return (
    <footer className="mt-auto border-t border-zinc-800/80 bg-brand-surface/80">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm text-zinc-500">
            © {new Date().getFullYear()} Punchline Atlas. All rights reserved.
          </p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Legal">
            <Link
              href="/terms"
              className="text-sm text-zinc-400 hover:text-brand-gold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:ring-offset-2 focus:ring-offset-brand-surface rounded"
            >
              Terms & Conditions
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-zinc-400 hover:text-brand-gold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:ring-offset-2 focus:ring-offset-brand-surface rounded"
            >
              Privacy Policy
            </Link>
            <button
              type="button"
              onClick={openPreferences}
              className="text-sm text-zinc-400 hover:text-brand-gold transition-colors text-left focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:ring-offset-2 focus:ring-offset-brand-surface rounded"
            >
              Cookie preferences
            </button>
          </nav>
        </div>
      </div>
    </footer>
  );
}
