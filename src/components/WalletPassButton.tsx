"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getPlatform } from "@/lib/native";

interface Props {
  ticketId: string;
  /** Override platform detection */
  forcePlatform?: "apple" | "google";
}

/**
 * "Add to Wallet" button component.
 *
 * Detects the platform (iOS -> Apple Wallet, Android -> Google Wallet)
 * and generates the appropriate pass. Shows both options on desktop.
 */
export function WalletPassButton({ ticketId, forcePlatform }: Props) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState<"apple" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passUrl, setPassUrl] = useState<string | null>(null);

  const platform = getPlatform();
  const showApple = forcePlatform === "apple" || !forcePlatform;
  const showGoogle = forcePlatform === "google" || !forcePlatform;

  // On mobile, only show the relevant platform
  const showBoth = platform === "web";
  const appleVisible =
    showApple && (showBoth || platform === "ios" || forcePlatform === "apple");
  const googleVisible =
    showGoogle &&
    (showBoth || platform === "android" || forcePlatform === "google");

  const handleGenerate = useCallback(
    async (targetPlatform: "apple" | "google") => {
      if (!session?.user) return;
      setLoading(targetPlatform);
      setError(null);

      try {
        const res = await fetch("/api/wallet/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketId, platform: targetPlatform }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Failed to generate pass");
          return;
        }

        const data = await res.json();
        setPassUrl(data.passUrl);

        // Open the pass URL (in production, this would download a .pkpass
        // or redirect to Google Pay save URL)
        if (data.passUrl) {
          window.open(data.passUrl, "_blank", "noopener,noreferrer");
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(null);
      }
    },
    [session, ticketId]
  );

  if (!session?.user) return null;

  if (passUrl) {
    return (
      <div className="flex items-center gap-2 text-green-400 text-sm">
        <svg
          className="w-4 h-4"
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
        <span>Pass added to wallet</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {appleVisible && (
          <button
            onClick={() => handleGenerate("apple")}
            disabled={loading !== null}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-lg text-sm font-medium border border-zinc-700 hover:bg-zinc-900 transition-colors disabled:opacity-60"
          >
            {loading === "apple" ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 21.99 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 21.99C7.79 22.03 6.8 20.68 5.96 19.47C4.25 16.97 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
              </svg>
            )}
            <span className="flex flex-col items-start leading-tight">
              <span className="text-[10px] font-normal opacity-80">
                Add to
              </span>
              <span className="text-xs font-semibold -mt-0.5">
                Apple Wallet
              </span>
            </span>
          </button>
        )}

        {googleVisible && (
          <button
            onClick={() => handleGenerate("google")}
            disabled={loading !== null}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-zinc-900 rounded-lg text-sm font-medium border border-zinc-200 hover:bg-zinc-50 transition-colors disabled:opacity-60"
          >
            {loading === "google" ? (
              <div className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-800 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            <span className="flex flex-col items-start leading-tight">
              <span className="text-[10px] font-normal opacity-60">
                Add to
              </span>
              <span className="text-xs font-semibold -mt-0.5">
                Google Wallet
              </span>
            </span>
          </button>
        )}
      </div>

      {error && (
        <p className="text-red-400 text-xs flex items-center gap-1">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
