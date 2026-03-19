"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  isOnline as checkOnline,
  onConnectivityChange,
  enqueueSync,
  processSyncQueue,
  getSyncQueueSize,
  type OfflineAction,
  type SyncQueueItem,
} from "@/lib/offline";

export interface UseOfflineSyncOptions {
  /** Automatically process queue when coming back online. Default: true */
  autoSync?: boolean;
  /** Interval to retry sync (ms). Default: 30000 (30s) */
  retryInterval?: number;
  /** Callback after queue is processed */
  onSyncComplete?: (result: { synced: number; failed: number; remaining: number }) => void;
}

export interface UseOfflineSyncReturn {
  /** Whether the device is currently online */
  online: boolean;
  /** Number of pending sync items */
  pendingCount: number;
  /** Whether sync is currently in progress */
  syncing: boolean;
  /**
   * Perform a fetch that falls back to offline queue on failure.
   * Returns the fetch response if online & successful, or null if queued.
   */
  offlineFetch: (
    url: string,
    options: {
      method: "POST" | "PUT" | "PATCH" | "DELETE";
      body?: Record<string, unknown>;
      action: OfflineAction;
      headers?: Record<string, string>;
      maxRetries?: number;
    }
  ) => Promise<Response | null>;
  /** Manually trigger sync processing */
  syncNow: () => Promise<void>;
}

/**
 * Hook for offline-aware components.
 *
 * Tracks connectivity, queues failed requests for background sync,
 * and processes the queue when the connection restores.
 *
 * @example
 * const { online, offlineFetch, pendingCount } = useOfflineSync();
 *
 * async function handleFollow(comedianId: string) {
 *   const res = await offlineFetch(`/api/comedians/${comedianId}/follow`, {
 *     method: "POST",
 *     body: {},
 *     action: "follow_comedian",
 *   });
 *   if (res) {
 *     // Online success
 *   } else {
 *     // Queued for offline sync
 *   }
 * }
 */
export function useOfflineSync(
  options: UseOfflineSyncOptions = {}
): UseOfflineSyncReturn {
  const { autoSync = true, retryInterval = 30000, onSyncComplete } = options;

  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const retryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onSyncCompleteRef = useRef(onSyncComplete);
  onSyncCompleteRef.current = onSyncComplete;

  // Initialize online state
  useEffect(() => {
    setOnline(checkOnline());
  }, []);

  // Track connectivity changes
  useEffect(() => {
    const cleanup = onConnectivityChange((isOnline) => {
      setOnline(isOnline);
    });
    return cleanup;
  }, []);

  // Update pending count periodically
  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getSyncQueueSize();
      setPendingCount(count);
    } catch {
      // IndexedDB may not be available
    }
  }, []);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  // Process sync queue
  const syncNow = useCallback(async () => {
    if (syncing) return;
    if (!checkOnline()) return;

    setSyncing(true);
    try {
      const result = await processSyncQueue();
      await refreshPendingCount();
      onSyncCompleteRef.current?.(result);
    } catch {
      // Sync failed
    } finally {
      setSyncing(false);
    }
  }, [syncing, refreshPendingCount]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (online && autoSync && pendingCount > 0) {
      syncNow();
    }
  }, [online, autoSync, pendingCount, syncNow]);

  // Retry interval for background sync
  useEffect(() => {
    if (autoSync && online && pendingCount > 0) {
      retryTimerRef.current = setInterval(() => {
        if (checkOnline() && !syncing) {
          syncNow();
        }
      }, retryInterval);

      return () => {
        if (retryTimerRef.current) {
          clearInterval(retryTimerRef.current);
        }
      };
    }
  }, [autoSync, online, pendingCount, retryInterval, syncing, syncNow]);

  // Offline-aware fetch
  const offlineFetch = useCallback(
    async (
      url: string,
      opts: {
        method: "POST" | "PUT" | "PATCH" | "DELETE";
        body?: Record<string, unknown>;
        action: OfflineAction;
        headers?: Record<string, string>;
        maxRetries?: number;
      }
    ): Promise<Response | null> => {
      const bodyStr = opts.body ? JSON.stringify(opts.body) : undefined;

      // If online, try the request first
      if (checkOnline()) {
        try {
          const response = await fetch(url, {
            method: opts.method,
            headers: {
              "Content-Type": "application/json",
              ...(opts.headers ?? {}),
            },
            body: bodyStr,
          });

          if (response.ok) {
            return response;
          }

          // Server error (5xx) - queue for retry
          if (response.status >= 500) {
            await enqueueSync({
              action: opts.action,
              url,
              method: opts.method,
              body: bodyStr,
              headers: opts.headers,
              maxRetries: opts.maxRetries ?? 5,
            });
            await refreshPendingCount();
            return null;
          }

          // Client error (4xx) - return as-is, don't queue
          return response;
        } catch {
          // Network error - queue it
          await enqueueSync({
            action: opts.action,
            url,
            method: opts.method,
            body: bodyStr,
            headers: opts.headers,
            maxRetries: opts.maxRetries ?? 5,
          });
          await refreshPendingCount();
          return null;
        }
      }

      // Offline - queue it
      await enqueueSync({
        action: opts.action,
        url,
        method: opts.method,
        body: bodyStr,
        headers: opts.headers,
        maxRetries: opts.maxRetries ?? 5,
      });
      await refreshPendingCount();
      return null;
    },
    [refreshPendingCount]
  );

  return {
    online,
    pendingCount,
    syncing,
    offlineFetch,
    syncNow,
  };
}
