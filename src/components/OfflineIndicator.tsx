"use client";

import { useState, useEffect, useCallback } from "react";
import { isOnline, onConnectivityChange, getSyncQueueSize, processSyncQueue } from "@/lib/offline";

/**
 * Connection status indicator component.
 *
 * Shows a banner when the user goes offline, and a brief success message
 * when connectivity is restored. Also displays sync queue status.
 */
export function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  // Initialize
  useEffect(() => {
    setOnline(isOnline());
  }, []);

  // Track connectivity
  useEffect(() => {
    const cleanup = onConnectivityChange((isNowOnline) => {
      if (isNowOnline && !online) {
        setWasOffline(true);
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 4000);
      }
      setOnline(isNowOnline);
    });
    return cleanup;
  }, [online]);

  // Check sync queue periodically
  useEffect(() => {
    const checkQueue = async () => {
      try {
        const count = await getSyncQueueSize();
        setPendingCount(count);
      } catch {
        // IndexedDB may not be available
      }
    };

    checkQueue();
    const interval = setInterval(checkQueue, 10000);
    return () => clearInterval(interval);
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (online && wasOffline && pendingCount > 0) {
      handleSync();
      setWasOffline(false);
    }
  }, [online, wasOffline, pendingCount]);

  const handleSync = useCallback(async () => {
    if (syncing || !isOnline()) return;
    setSyncing(true);
    try {
      await processSyncQueue();
      const remaining = await getSyncQueueSize();
      setPendingCount(remaining);
    } catch {
      // Sync failed
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  // Offline banner
  if (!online) {
    return (
      <div className="fixed bottom-0 inset-x-0 z-40 safe-area-bottom">
        <div className="bg-zinc-900 border-t border-zinc-700 px-4 py-3">
          <div className="max-w-screen-lg mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
              <div>
                <p className="text-zinc-200 text-sm font-medium">
                  You&apos;re offline
                </p>
                <p className="text-zinc-500 text-xs">
                  {pendingCount > 0
                    ? `${pendingCount} action${pendingCount > 1 ? "s" : ""} will sync when you reconnect`
                    : "Some features may be unavailable"}
                </p>
              </div>
            </div>
            <a
              href="/offline"
              className="text-brand-gold text-xs font-medium hover:underline shrink-0"
            >
              Learn more
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Reconnected toast
  if (showReconnected) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom duration-300">
        <div className="bg-green-900/90 border border-green-700 text-green-100 px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2.5 text-sm">
          <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
          <span className="font-medium">Back online</span>
          {pendingCount > 0 && (
            <span className="text-green-300">
              — syncing {pendingCount} pending action
              {pendingCount > 1 ? "s" : ""}...
            </span>
          )}
        </div>
      </div>
    );
  }

  // Pending sync indicator (small badge, only when there are pending items)
  if (pendingCount > 0 && online) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="bg-zinc-900 border border-zinc-700 rounded-full px-3 py-2 shadow-lg flex items-center gap-2 text-xs hover:bg-zinc-800 transition-colors"
          title="Sync pending actions"
        >
          {syncing ? (
            <div className="w-3.5 h-3.5 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin" />
          ) : (
            <svg
              className="w-3.5 h-3.5 text-brand-gold"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          )}
          <span className="text-zinc-300">
            {syncing
              ? "Syncing..."
              : `${pendingCount} pending`}
          </span>
        </button>
      </div>
    );
  }

  return null;
}
