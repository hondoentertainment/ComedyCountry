"use client";

import { useEffect, useState } from "react";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // If we're back online, redirect to home
  useEffect(() => {
    if (isOnline) {
      const timer = setTimeout(() => {
        window.location.href = "/";
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Offline icon */}
        <div className="mx-auto w-24 h-24 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-8">
          {isOnline ? (
            <svg
              className="w-12 h-12 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0"
              />
            </svg>
          ) : (
            <svg
              className="w-12 h-12 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          )}
        </div>

        {isOnline ? (
          <>
            <h1 className="text-2xl font-bold text-white mb-3">
              You&apos;re Back Online!
            </h1>
            <p className="text-zinc-400 mb-8">
              Connection restored. Redirecting you back...
            </p>
            <div className="flex justify-center">
              <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white mb-3">
              You&apos;re Offline
            </h1>
            <p className="text-zinc-400 mb-8 leading-relaxed">
              It looks like you&apos;ve lost your internet connection. Some features
              may be unavailable, but you can still browse previously loaded
              content.
            </p>

            {/* What you can still do */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8 text-left">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4">
                While offline you can
              </h2>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-brand-gold mt-0.5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-zinc-300 text-sm">
                    View cached shows and comedian profiles
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-brand-gold mt-0.5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-zinc-300 text-sm">
                    Access your saved tickets and wallet passes
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-brand-gold mt-0.5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-zinc-300 text-sm">
                    Queue follows and RSVPs — they&apos;ll sync when you reconnect
                  </span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-6 py-3 bg-brand-gold text-brand-dark font-semibold rounded-lg hover:bg-brand-gold/90 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => {
                  if (window.history.length > 1) {
                    window.history.back();
                  } else {
                    window.location.href = "/";
                  }
                }}
                className="w-full px-6 py-3 bg-zinc-800 text-zinc-300 font-semibold rounded-lg hover:bg-zinc-700 transition-colors border border-zinc-700"
              >
                Go Back
              </button>
            </div>
          </>
        )}

        <p className="mt-8 text-zinc-600 text-xs">
          Punchline Atlas works best with an internet connection
        </p>
      </div>
    </div>
  );
}
