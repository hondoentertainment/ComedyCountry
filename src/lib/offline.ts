/**
 * Offline support utilities.
 *
 * Provides an IndexedDB wrapper for offline data storage, a sync queue
 * for deferred actions, and background sync when connection restores.
 */

const DB_NAME = "punchline-atlas-offline";
const DB_VERSION = 1;
const STORE_CACHE = "cache";
const STORE_SYNC_QUEUE = "syncQueue";

export interface SyncQueueItem {
  id: string;
  action: OfflineAction;
  url: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  body?: string;
  headers?: Record<string, string>;
  createdAt: number;
  retryCount: number;
  maxRetries: number;
}

export type OfflineAction =
  | "follow_comedian"
  | "unfollow_comedian"
  | "follow_venue"
  | "unfollow_venue"
  | "rsvp_event"
  | "cancel_rsvp"
  | "rate_comedian"
  | "review_event"
  | "save_list";

export interface CachedData {
  key: string;
  data: unknown;
  expiresAt: number;
  updatedAt: number;
}

/**
 * Open (or create) the IndexedDB database.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        const cacheStore = db.createObjectStore(STORE_CACHE, { keyPath: "key" });
        cacheStore.createIndex("expiresAt", "expiresAt", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORE_SYNC_QUEUE, {
          keyPath: "id",
        });
        syncStore.createIndex("createdAt", "createdAt", { unique: false });
        syncStore.createIndex("action", "action", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic IDB transaction helper.
 */
async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = callback(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

// ─── Cache API ───────────────────────────────────────────────────────────────

/**
 * Store data in the offline cache.
 * @param key   Cache key (e.g. "comedians:list", "events:abc123")
 * @param data  Data to cache (must be serializable)
 * @param ttlMs Time-to-live in milliseconds (default: 1 hour)
 */
export async function cacheSet(
  key: string,
  data: unknown,
  ttlMs: number = 3600000
): Promise<void> {
  const now = Date.now();
  const entry: CachedData = {
    key,
    data,
    expiresAt: now + ttlMs,
    updatedAt: now,
  };
  await withStore(STORE_CACHE, "readwrite", (store) => store.put(entry));
}

/**
 * Retrieve data from the offline cache.
 * Returns null if not found or expired.
 */
export async function cacheGet<T = unknown>(key: string): Promise<T | null> {
  try {
    const entry = await withStore<CachedData | undefined>(
      STORE_CACHE,
      "readonly",
      (store) => store.get(key)
    );
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      // Expired, remove it
      await cacheDelete(key);
      return null;
    }
    return entry.data as T;
  } catch {
    return null;
  }
}

/**
 * Delete a single cache entry.
 */
export async function cacheDelete(key: string): Promise<void> {
  await withStore(STORE_CACHE, "readwrite", (store) => store.delete(key));
}

/**
 * Clear all expired cache entries.
 */
export async function cachePurgeExpired(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CACHE, "readwrite");
    const store = tx.objectStore(STORE_CACHE);
    const index = store.index("expiresAt");
    const now = Date.now();
    const range = IDBKeyRange.upperBound(now);
    const request = index.openCursor(range);
    let deleted = 0;

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        deleted++;
        cursor.continue();
      }
    };

    tx.oncomplete = () => {
      db.close();
      resolve(deleted);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/**
 * Clear entire cache.
 */
export async function cacheClear(): Promise<void> {
  await withStore(STORE_CACHE, "readwrite", (store) => store.clear());
}

// ─── Sync Queue API ─────────────────────────────────────────────────────────

/**
 * Generate a unique ID for sync queue items.
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Add an action to the offline sync queue.
 */
export async function enqueueSync(item: Omit<SyncQueueItem, "id" | "createdAt" | "retryCount">): Promise<string> {
  const entry: SyncQueueItem = {
    ...item,
    id: generateId(),
    createdAt: Date.now(),
    retryCount: 0,
  };
  await withStore(STORE_SYNC_QUEUE, "readwrite", (store) => store.put(entry));
  return entry.id;
}

/**
 * Get all pending sync queue items, ordered by creation time.
 */
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SYNC_QUEUE, "readonly");
    const store = tx.objectStore(STORE_SYNC_QUEUE);
    const index = store.index("createdAt");
    const request = index.getAll();

    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

/**
 * Remove a successfully synced item from the queue.
 */
export async function removeSyncItem(id: string): Promise<void> {
  await withStore(STORE_SYNC_QUEUE, "readwrite", (store) => store.delete(id));
}

/**
 * Update the retry count for a failed sync item.
 */
export async function updateSyncRetry(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SYNC_QUEUE, "readwrite");
    const store = tx.objectStore(STORE_SYNC_QUEUE);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const item = getReq.result as SyncQueueItem | undefined;
      if (!item) {
        db.close();
        resolve();
        return;
      }

      item.retryCount++;

      if (item.retryCount >= item.maxRetries) {
        // Max retries exceeded, remove from queue
        store.delete(id);
      } else {
        store.put(item);
      }
    };

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/**
 * Process the entire sync queue: attempt each queued request.
 * Returns the number of successfully synced items.
 */
export async function processSyncQueue(): Promise<{
  synced: number;
  failed: number;
  remaining: number;
}> {
  const queue = await getSyncQueue();
  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: {
          "Content-Type": "application/json",
          ...(item.headers ?? {}),
        },
        body: item.body,
      });

      if (response.ok) {
        await removeSyncItem(item.id);
        synced++;
      } else if (response.status >= 400 && response.status < 500) {
        // Client error (bad request, unauthorized, etc.) - don't retry
        await removeSyncItem(item.id);
        failed++;
      } else {
        // Server error - increment retry
        await updateSyncRetry(item.id);
        failed++;
      }
    } catch {
      // Network error - increment retry
      await updateSyncRetry(item.id);
      failed++;
    }
  }

  const remaining = (await getSyncQueue()).length;
  return { synced, failed, remaining };
}

/**
 * Get the current sync queue size.
 */
export async function getSyncQueueSize(): Promise<number> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SYNC_QUEUE, "readonly");
      const store = tx.objectStore(STORE_SYNC_QUEUE);
      const request = store.count();
      request.onsuccess = () => {
        db.close();
        resolve(request.result);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch {
    return 0;
  }
}

/**
 * Check if the browser is currently online.
 */
export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

/**
 * Register listeners for online/offline events.
 * Returns a cleanup function.
 */
export function onConnectivityChange(
  callback: (online: boolean) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}
