import type { UiTimelineItem } from "../api/contracts";

const DB_NAME = "sbird-web-cache";
const DB_VERSION = 5;
const LEGACY_STORE_SNAPSHOT = "thread_timeline";

// Keep timeline data in META + ITEMS stores to support durable windows and paging queries.
const STORE_META = "thread_timeline_meta";
const STORE_ITEMS = "thread_timeline_items";
const STORE_ITEMS_INDEX_BY_THREAD_ITEM_ID = "by_thread_item_id";
export const STORE_LARGE_PAYLOAD = "thread_timeline_large_payload";

/**
 * Maximum age (ms) for cached thread data before it becomes eligible for eviction.
 * Default: 7 days.
 */
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Maximum number of threads to keep in cache. When exceeded, oldest threads
 * (by cachedAtIso) are evicted first.
 */
const MAX_CACHED_THREADS = 100;

// ── DB Connection (with retry on failure) ──────────────────────────────────

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Open (or reuse) the IndexedDB cache database.
 *
 * If the previous open attempt failed, the cached rejected promise is cleared
 * so the next call retries the connection — this handles transient browser
 * storage errors or user-denied permission that may resolve later.
 */
export function openCacheDb(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB is not available"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      // ── Version 0 → 1+: initial schema ──────────────────────────────
      // Clean up legacy store from earlier schema iterations.
      if (db.objectStoreNames.contains(LEGACY_STORE_SNAPSHOT)) {
        db.deleteObjectStore(LEGACY_STORE_SNAPSHOT);
      }

      // ── Version < 3: create META store ───────────────────────────────
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: "threadId" });
        }
      }

      // ── Version < 4: create ITEMS store + index ──────────────────────
      let itemsStore: IDBObjectStore | null = null;
      if (oldVersion < 4) {
        if (!db.objectStoreNames.contains(STORE_ITEMS)) {
          itemsStore = db.createObjectStore(STORE_ITEMS, {
            keyPath: ["threadId", "displaySeq"],
          });
        }
      }

      // Ensure we can grab the store handle for index creation in any upgrade path.
      if (!itemsStore && db.objectStoreNames.contains(STORE_ITEMS)) {
        itemsStore = request.transaction?.objectStore(STORE_ITEMS) ?? null;
      }

      if (
        itemsStore &&
        !itemsStore.indexNames.contains(STORE_ITEMS_INDEX_BY_THREAD_ITEM_ID)
      ) {
        itemsStore.createIndex(
          STORE_ITEMS_INDEX_BY_THREAD_ITEM_ID,
          ["threadId", "id"],
          { unique: false },
        );
      }

      // ── Version < 5: create LARGE_PAYLOAD store ─────────────────────
      if (oldVersion < 5) {
        if (!db.objectStoreNames.contains(STORE_LARGE_PAYLOAD)) {
          db.createObjectStore(STORE_LARGE_PAYLOAD, {
            keyPath: ["threadId", "itemId", "kind"],
          });
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open indexedDB"));
  });

  // If the open promise rejects, clear the cache so the next call retries.
  dbPromise.catch(() => {
    dbPromise = null;
  });

  return dbPromise;
}

// ── Persistable item helpers ───────────────────────────────────────────────

function isPersistableItem(item: UiTimelineItem): boolean {
  const id = item.id.trim();
  if (!id) return false;
  if (id.startsWith("user-local-")) return false;
  if (id.startsWith("thread-error-")) return false;
  return true;
}

export type ThreadTimelineMeta = {
  threadId: string;
  cachedAtIso: string;
  durableCount: number;
  maxDisplaySeq: number;
};

export type ThreadTimelinePersistResult =
  | { ok: true }
  | { ok: false; error: string };

export type PersistableTimelineItem = UiTimelineItem & {
  displaySeq: number;
};

function asPersistableItem(
  item: UiTimelineItem,
): PersistableTimelineItem | null {
  if (!isPersistableItem(item)) return null;
  if (
    typeof item.displaySeq !== "number" ||
    !Number.isFinite(item.displaySeq)
  )
    return null;
  return item as PersistableTimelineItem;
}

// ── Meta CRUD ──────────────────────────────────────────────────────────────

async function getMeta(
  threadId: string,
): Promise<ThreadTimelineMeta | null> {
  try {
    const db = await openCacheDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, "readonly");
      const store = tx.objectStore(STORE_META);
      const req = store.get(threadId);
      req.onsuccess = () => {
        const value = req.result as Partial<ThreadTimelineMeta> | undefined;
        if (!value || typeof value !== "object") {
          resolve(null);
          return;
        }
        if (value.threadId !== threadId) {
          resolve(null);
          return;
        }
        resolve({
          threadId,
          cachedAtIso:
            typeof value.cachedAtIso === "string"
              ? value.cachedAtIso
              : new Date().toISOString(),
          durableCount:
            typeof value.durableCount === "number" ? value.durableCount : 0,
          maxDisplaySeq:
            typeof value.maxDisplaySeq === "number" ? value.maxDisplaySeq : 0,
        });
      };
      req.onerror = () =>
        reject(req.error ?? new Error("indexedDB meta get failed"));
    });
  } catch {
    return null;
  }
}

/**
 * Write meta — waits for **tx.oncomplete** (not just req.onsuccess) to ensure
 * durability before the returned promise resolves.
 */
async function putMeta(meta: ThreadTimelineMeta): Promise<void> {
  const db = await openCacheDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_META, "readwrite");
    const store = tx.objectStore(STORE_META);
    store.put(meta);
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error("indexedDB meta put failed"));
    tx.onabort = () =>
      reject(tx.error ?? new Error("indexedDB meta put aborted"));
  });
}

// ── Deduplication ──────────────────────────────────────────────────────────

function dedupePersistableItemsById(
  items: PersistableTimelineItem[],
): PersistableTimelineItem[] {
  const latestById = new Map<string, PersistableTimelineItem>();
  for (const item of items) {
    const existing = latestById.get(item.id);
    if (!existing || item.displaySeq >= existing.displaySeq) {
      latestById.set(item.id, item);
    }
  }
  return [...latestById.values()];
}

// ── Low-level IDB helpers ──────────────────────────────────────────────────

function requestToPromise<T>(
  request: IDBRequest<T>,
  message: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error(message));
  });
}

/**
 * Remove older rows sharing the same (threadId, itemId) but with a different
 * displaySeq than the canonical one we're about to write.
 *
 * Uses synchronous cursor iteration (no await inside the loop) so the
 * transaction stays alive in all browser engines.
 */
function removeOlderRowsForItem(
  itemIndex: IDBIndex,
  threadId: string,
  itemId: string,
  keepDisplaySeq: number,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const range = IDBKeyRange.only([threadId, itemId]);
    const cursorRequest = itemIndex.openCursor(range);
    cursorRequest.onerror = () =>
      reject(
        cursorRequest.error ??
          new Error("indexedDB stale row scan failed"),
      );
    cursorRequest.onsuccess = () => {
      const cursor =
        cursorRequest.result as IDBCursorWithValue | null;
      if (!cursor) {
        resolve();
        return;
      }
      const row = cursor.value as { displaySeq?: unknown } | null;
      const rowDisplaySeq =
        row &&
        typeof row.displaySeq === "number" &&
        Number.isFinite(row.displaySeq)
          ? row.displaySeq
          : null;
      if (rowDisplaySeq !== keepDisplaySeq) {
        const deleteRequest = cursor.delete();
        deleteRequest.onerror = () =>
          reject(
            deleteRequest.error ??
              new Error("indexedDB stale row delete failed"),
          );
        deleteRequest.onsuccess = () => cursor.continue();
        return;
      }
      cursor.continue();
    };
  });
}

// ── Cached item dedup helper ───────────────────────────────────────────────

function pushDedupedCachedItem(
  target: UiTimelineItem[],
  seenIds: Set<string>,
  item: UiTimelineItem,
): boolean {
  const id = item.id?.trim();
  if (!id) {
    target.push(item);
    return true;
  }
  if (seenIds.has(id)) {
    return false;
  }
  seenIds.add(id);
  target.push(item);
  return true;
}

// ── Load items (tail / before) ─────────────────────────────────────────────

async function loadItemsTail(
  threadId: string,
  limit: number,
): Promise<UiTimelineItem[]> {
  const normalizedLimit = Number.isFinite(limit)
    ? Math.max(0, Math.floor(limit))
    : 0;
  if (normalizedLimit <= 0) {
    return [];
  }
  const db = await openCacheDb();
  return await new Promise<UiTimelineItem[]>((resolve, reject) => {
    const items: UiTimelineItem[] = [];
    const seenIds = new Set<string>();
    const tx = db.transaction(STORE_ITEMS, "readonly");
    const store = tx.objectStore(STORE_ITEMS);
    const range = IDBKeyRange.bound(
      [threadId, 0],
      [threadId, Number.MAX_SAFE_INTEGER],
    );
    const req = store.openCursor(range, "prev");
    req.onerror = () =>
      reject(req.error ?? new Error("indexedDB cursor failed"));
    req.onsuccess = () => {
      const cursor = req.result as IDBCursorWithValue | null;
      if (!cursor) {
        resolve(items.reverse());
        return;
      }
      const row = cursor.value as { item?: UiTimelineItem } | null;
      if (row && row.item) {
        if (pushDedupedCachedItem(items, seenIds, row.item)) {
          if (items.length >= normalizedLimit) {
            resolve(items.reverse());
            return;
          }
        }
      }
      cursor.continue();
    };
  });
}

async function loadItemsBefore(
  threadId: string,
  beforeDisplaySeq: number,
  limit: number,
): Promise<UiTimelineItem[]> {
  const normalizedLimit = Number.isFinite(limit)
    ? Math.max(0, Math.floor(limit))
    : 0;
  if (normalizedLimit <= 0) {
    return [];
  }
  const before = Number.isFinite(beforeDisplaySeq)
    ? Math.floor(beforeDisplaySeq)
    : 0;
  if (before <= 0) {
    return [];
  }
  const db = await openCacheDb();
  return await new Promise<UiTimelineItem[]>((resolve, reject) => {
    const items: UiTimelineItem[] = [];
    const seenIds = new Set<string>();
    const tx = db.transaction(STORE_ITEMS, "readonly");
    const store = tx.objectStore(STORE_ITEMS);
    const range = IDBKeyRange.bound(
      [threadId, 0],
      [threadId, before - 1],
    );
    const req = store.openCursor(range, "prev");
    req.onerror = () =>
      reject(req.error ?? new Error("indexedDB cursor failed"));
    req.onsuccess = () => {
      const cursor = req.result as IDBCursorWithValue | null;
      if (!cursor) {
        resolve(items.reverse());
        return;
      }
      const row = cursor.value as { item?: UiTimelineItem } | null;
      if (row && row.item) {
        if (pushDedupedCachedItem(items, seenIds, row.item)) {
          if (items.length >= normalizedLimit) {
            resolve(items.reverse());
            return;
          }
        }
      }
      cursor.continue();
    };
  });
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function clearThreadTimeline(params: {
  threadId: string;
}): Promise<ThreadTimelinePersistResult> {
  const normalizedThreadId = params.threadId.trim();
  if (!normalizedThreadId)
    return { ok: false, error: "Missing threadId" };

  try {
    const db = await openCacheDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        [STORE_ITEMS, STORE_META],
        "readwrite",
      );
      const itemsStore = tx.objectStore(STORE_ITEMS);
      const metaStore = tx.objectStore(STORE_META);

      metaStore.delete(normalizedThreadId);

      const range = IDBKeyRange.bound(
        [normalizedThreadId, 0],
        [normalizedThreadId, Number.MAX_SAFE_INTEGER],
      );
      const req = itemsStore.openCursor(range);
      req.onerror = () =>
        reject(req.error ?? new Error("indexedDB cursor failed"));
      req.onsuccess = () => {
        const cursor = req.result as IDBCursorWithValue | null;
        if (!cursor) {
          return; // cursor exhausted — tx.oncomplete will resolve
        }
        cursor.delete();
        cursor.continue();
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(
          tx.error ?? new Error("indexedDB transaction failed"),
        );
      tx.onabort = () =>
        reject(
          tx.error ?? new Error("indexedDB transaction aborted"),
        );
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to clear thread timeline",
    };
  }
}

export async function loadThreadTimelineMeta(
  threadId: string,
): Promise<ThreadTimelineMeta | null> {
  const normalizedThreadId = threadId.trim();
  if (!normalizedThreadId) return null;
  return await getMeta(normalizedThreadId);
}

export async function saveThreadTimelineMeta(
  threadId: string,
  patch: Partial<ThreadTimelineMeta>,
): Promise<ThreadTimelinePersistResult> {
  const normalizedThreadId = threadId.trim();
  if (!normalizedThreadId)
    return { ok: false, error: "Missing threadId" };
  try {
    const existing = await getMeta(normalizedThreadId);
    const merged: ThreadTimelineMeta = {
      threadId: normalizedThreadId,
      cachedAtIso: new Date().toISOString(),
      durableCount:
        typeof patch.durableCount === "number"
          ? patch.durableCount
          : (existing?.durableCount ?? 0),
      maxDisplaySeq:
        typeof patch.maxDisplaySeq === "number"
          ? patch.maxDisplaySeq
          : (existing?.maxDisplaySeq ?? 0),
    };
    await putMeta(merged);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to persist meta",
    };
  }
}

/**
 * Append timeline items to the cache.
 *
 * IMPORTANT: This function avoids `await` inside the IDB transaction to
 * prevent premature transaction auto-commit. All cursor / write operations
 * use synchronous IDB request chaining within a single transaction.
 */
export async function appendThreadTimelineItems(params: {
  threadId: string;
  items: UiTimelineItem[];
  durableCount?: number;
}): Promise<ThreadTimelinePersistResult> {
  const normalizedThreadId = params.threadId.trim();
  if (!normalizedThreadId)
    return { ok: false, error: "Missing threadId" };

  const persistable = dedupePersistableItemsById(
    params.items
      .map(asPersistableItem)
      .filter(
        (item): item is PersistableTimelineItem => Boolean(item),
      ),
  );
  if (
    persistable.length === 0 &&
    typeof params.durableCount !== "number"
  ) {
    return { ok: true };
  }

  try {
    const db = await openCacheDb();
    const nowIso = new Date().toISOString();
    const maxDisplaySeq = persistable.reduce(
      (max, item) => Math.max(max, item.displaySeq),
      0,
    );

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        [STORE_ITEMS, STORE_META],
        "readwrite",
      );
      const itemsStore = tx.objectStore(STORE_ITEMS);
      const metaStore = tx.objectStore(STORE_META);
      const itemIndex = itemsStore.indexNames.contains(
        STORE_ITEMS_INDEX_BY_THREAD_ITEM_ID,
      )
        ? itemsStore.index(STORE_ITEMS_INDEX_BY_THREAD_ITEM_ID)
        : null;

      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(
          tx.error ?? new Error("indexedDB transaction failed"),
        );
      tx.onabort = () =>
        reject(
          tx.error ?? new Error("indexedDB transaction aborted"),
        );

      // Phase 1: Clean up stale rows (older displaySeq for same item id).
      // We chain cleanup synchronously — each removeOlderRowsForItem uses
      // cursor.onsuccess callbacks, NOT await, keeping the transaction alive.
      let cleanupChain = Promise.resolve();
      if (itemIndex) {
        for (const item of persistable) {
          cleanupChain = cleanupChain.then(() =>
            removeOlderRowsForItem(
              itemIndex,
              normalizedThreadId,
              item.id,
              item.displaySeq,
            ),
          );
        }
      }

      // Phase 2: After cleanup, write items + meta.
      cleanupChain
        .then(() => {
          for (const item of persistable) {
            itemsStore.put({
              threadId: normalizedThreadId,
              displaySeq: item.displaySeq,
              id: item.id,
              item,
            });
          }

          return requestToPromise(
            metaStore.get(normalizedThreadId),
            "indexedDB meta get failed",
          );
        })
        .then(
          (
            existingRaw:
              | Partial<ThreadTimelineMeta>
              | undefined,
          ) => {
            const existing = existingRaw ?? null;
            const next: ThreadTimelineMeta = {
              threadId: normalizedThreadId,
              cachedAtIso: nowIso,
              durableCount:
                typeof params.durableCount === "number"
                  ? params.durableCount
                  : typeof existing?.durableCount === "number"
                    ? existing.durableCount
                    : 0,
              maxDisplaySeq: Math.max(
                typeof existing?.maxDisplaySeq === "number"
                  ? existing.maxDisplaySeq
                  : 0,
                maxDisplaySeq,
              ),
            };
            metaStore.put(next);
          },
        )
        .catch(() => {
          try {
            tx.abort();
          } catch {
            // no-op: transaction already closed
          }
        });
    });

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to persist items",
    };
  }
}

export async function loadThreadTimelineTailWindow(params: {
  threadId: string;
  limit: number;
}): Promise<{
  meta: ThreadTimelineMeta | null;
  items: UiTimelineItem[];
}> {
  const normalizedThreadId = params.threadId.trim();
  if (!normalizedThreadId) return { meta: null, items: [] };
  const [meta, items] = await Promise.all([
    getMeta(normalizedThreadId),
    loadItemsTail(normalizedThreadId, params.limit),
  ]);
  return { meta, items };
}

export async function loadThreadTimelineBeforeWindow(params: {
  threadId: string;
  beforeDisplaySeq: number;
  limit: number;
}): Promise<{
  meta: ThreadTimelineMeta | null;
  items: UiTimelineItem[];
}> {
  const normalizedThreadId = params.threadId.trim();
  if (!normalizedThreadId) return { meta: null, items: [] };
  const [meta, items] = await Promise.all([
    getMeta(normalizedThreadId),
    loadItemsBefore(
      normalizedThreadId,
      params.beforeDisplaySeq,
      params.limit,
    ),
  ]);
  return { meta, items };
}

// ── Cache eviction ─────────────────────────────────────────────────────────

/**
 * Evict stale thread caches that exceed TTL or the max thread count.
 *
 * Call this periodically (e.g. on app startup or after successful hydration)
 * to prevent unbounded IndexedDB growth.
 *
 * Strategy:
 * 1. Delete all meta entries whose `cachedAtIso` is older than CACHE_TTL_MS.
 * 2. If remaining count > MAX_CACHED_THREADS, evict oldest until within limit.
 * 3. For each evicted threadId, delete its ITEMS and LARGE_PAYLOAD rows.
 */
export async function evictStaleCaches(): Promise<void> {
  try {
    const db = await openCacheDb();

    // Step 1: Read all meta entries.
    const allMeta = await new Promise<ThreadTimelineMeta[]>(
      (resolve, reject) => {
        const tx = db.transaction(STORE_META, "readonly");
        const store = tx.objectStore(STORE_META);
        const req = store.getAll();
        req.onsuccess = () => {
          const rows = (req.result ?? []) as ThreadTimelineMeta[];
          resolve(rows);
        };
        req.onerror = () =>
          reject(
            req.error ?? new Error("indexedDB meta getAll failed"),
          );
      },
    );

    if (allMeta.length === 0) return;

    const now = Date.now();
    const expired: string[] = [];
    const alive: ThreadTimelineMeta[] = [];

    for (const meta of allMeta) {
      const cachedAt = new Date(meta.cachedAtIso).getTime();
      if (Number.isNaN(cachedAt) || now - cachedAt > CACHE_TTL_MS) {
        expired.push(meta.threadId);
      } else {
        alive.push(meta);
      }
    }

    // Step 2: If still over limit, evict oldest alive entries.
    const overLimit: string[] = [];
    if (alive.length > MAX_CACHED_THREADS) {
      alive.sort(
        (a, b) =>
          new Date(a.cachedAtIso).getTime() -
          new Date(b.cachedAtIso).getTime(),
      );
      const toEvict = alive.length - MAX_CACHED_THREADS;
      for (let i = 0; i < toEvict; i++) {
        overLimit.push(alive[i].threadId);
      }
    }

    const threadIdsToEvict = [...expired, ...overLimit];
    if (threadIdsToEvict.length === 0) return;

    // Step 3: Delete data for each evicted thread.
    await new Promise<void>((resolve, reject) => {
      const stores = [STORE_META, STORE_ITEMS];
      if (db.objectStoreNames.contains(STORE_LARGE_PAYLOAD)) {
        stores.push(STORE_LARGE_PAYLOAD);
      }
      const tx = db.transaction(stores, "readwrite");
      const metaStore = tx.objectStore(STORE_META);
      const itemsStore = tx.objectStore(STORE_ITEMS);
      const payloadStore = db.objectStoreNames.contains(
        STORE_LARGE_PAYLOAD,
      )
        ? tx.objectStore(STORE_LARGE_PAYLOAD)
        : null;

      for (const threadId of threadIdsToEvict) {
        // Delete meta
        metaStore.delete(threadId);

        // Delete items via cursor (compound key prevents simple delete)
        const itemRange = IDBKeyRange.bound(
          [threadId, 0],
          [threadId, Number.MAX_SAFE_INTEGER],
        );
        const itemReq = itemsStore.openCursor(itemRange);
        itemReq.onsuccess = () => {
          const cursor =
            itemReq.result as IDBCursorWithValue | null;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };

        // Delete large payloads via cursor
        if (payloadStore) {
          const payloadRange = IDBKeyRange.bound(
            [threadId, "", ""],
            [threadId, "\uffff", "\uffff"],
          );
          const payloadReq =
            payloadStore.openCursor(payloadRange);
          payloadReq.onsuccess = () => {
            const cursor =
              payloadReq.result as IDBCursorWithValue | null;
            if (cursor) {
              cursor.delete();
              cursor.continue();
            }
          };
        }
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(
          tx.error ?? new Error("indexedDB eviction failed"),
        );
      tx.onabort = () =>
        reject(
          tx.error ?? new Error("indexedDB eviction aborted"),
        );
    });
  } catch {
    // Eviction is best-effort — don't let it crash the app.
  }
}
