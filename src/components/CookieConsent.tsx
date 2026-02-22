"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import Link from "next/link";

const CONSENT_KEY = "punchline-atlas-cookie-consent";
type ConsentStatus = "accepted" | "rejected" | null;

type CookieConsentContextValue = {
  consent: ConsentStatus;
  hasConsented: boolean;
  accept: () => void;
  reject: () => void;
  openPreferences: () => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(
  null
);

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    return {
      consent: null as ConsentStatus,
      hasConsented: false,
      accept: () => {},
      reject: () => {},
      openPreferences: () => {},
    };
  }
  return ctx;
}

export function CookieConsentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [consent, setConsent] = useState<ConsentStatus>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(CONSENT_KEY) as ConsentStatus | null;
    if (stored === "accepted" || stored === "rejected") {
      setConsent(stored);
    }
    setMounted(true);
  }, []);

  const persist = useCallback((value: ConsentStatus) => {
    if (typeof window === "undefined") return;
    if (value) {
      localStorage.setItem(CONSENT_KEY, value);
    } else {
      localStorage.removeItem(CONSENT_KEY);
    }
    setConsent(value);
  }, []);

  const accept = useCallback(() => persist("accepted"), [persist]);
  const reject = useCallback(() => persist("rejected"), [persist]);
  const openPreferences = useCallback(() => persist(null), [persist]);

  const value: CookieConsentContextValue = {
    consent,
    hasConsented: consent === "accepted",
    accept,
    reject,
    openPreferences,
  };

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function CookieBanner() {
  const { consent, accept, reject } = useCookieConsent();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-zinc-700 bg-brand-dark/98 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/98 p-4 sm:p-6 shadow-lg"
    >
      <div className="mx-auto max-w-3xl flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 text-sm text-zinc-300">
          <p>
            We use essential and optional cookies. Google Maps (used on our map page) may set cookies when you view it.
            By accepting, you allow non-essential cookies.{" "}
            <Link
              href="/privacy"
              className="text-brand-gold hover:underline font-medium"
            >
              Privacy Policy
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={reject}
            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white border border-zinc-600 rounded-md hover:bg-zinc-800/50 transition-colors"
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={accept}
            className="px-4 py-2 text-sm font-medium text-brand-dark bg-brand-gold hover:bg-brand-gold/90 rounded-md transition-colors"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
