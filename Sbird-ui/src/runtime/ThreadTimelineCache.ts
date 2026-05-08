import type { UiTimelineItem } from "../api/contracts";

const DB_NAME = "sbird-web-cache";
const DB_VERSION = 5;
const LEGACY_STORE_SNAPSHOT = "thread_timeline";

// Keep timeline data in META + ITEMS stores to support durable windows and paging queries.
const STORE_META = "thread_timeline_meta";
const STORE_ITEMS = "thread_timeline_items";
const STORE_ITEMS_INDEX_BY_THREAD_ITEM_ID = "by_thread_item_id";
export const STORE_LARGE_PAYLOAD = "thread_timeline_large_payload";

let dbPromise: Promise<IDBDatabase> | null = null;

export function openCacheDb(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB is not available"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (db.objectStoreNames.contains(LEGACY_STORE_SNAPSHOT)) {
        db.deleteObjectStore(LEGACY_STORE_SNAPSHOT);
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "threadId" });
      }
      let itemsStore: IDBObjectStore | null = null;
      if (!db.objectStoreNames.contains(STORE_ITEMS)) {
        // Key by (threadId, displaySeq) so we can page via key ranges.
        itemsStore = db.createObjectStore(STORE_ITEMS, { keyPath: ["threadId", "displaySeq"] });
      } else {
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
      if (!db.objectStoreNames.contains(STORE_LARGE_PAYLOAD)) {
        db.createObjectStore(STORE_LARGE_PAYLOAD, { keyPath: ["threadId", "itemId", "kind"] });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open indexedDB"));
  });
  return dbPromise;
}

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

export type ThreadTimelinePersistResult = { ok: true } | { ok: false; error: string };

export type PersistableTimelineItem = UiTimelineItem & { displaySeq: number };

function asPersistableItem(item: UiTimelineItem): PersistableTimelineItem | null {
  if (!isPersistableItem(item)) return null;
  if (typeof item.displaySeq !== "number" || !Number.isFinite(item.displaySeq)) return null;
  return item as PersistableTimelineItem;
}

async function getMeta(threadId: string): Promise<ThreadTimelineMeta | null> {
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
          cachedAtIso: typeof value.cachedAtIso === "string" ? value.cachedAtIso : new Date().toISOString(),
          durableCount: typeof value.durableCount === "number" ? value.durableCount : 0,
          maxDisplaySeq: typeof value.maxDisplaySeq === "number" ? value.maxDisplaySeq : 0,
        });
      };
      req.onerror = () => reject(req.error ?? new Error("indexedDB meta get failed"));
    });
  } catch {
    return null;
  }
}

async function putMeta(meta: ThreadTimelineMeta): Promise<void> {
  const db = await openCacheDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_META, "readwrite");
    const store = tx.objectStore(STORE_META);
    const req = store.put(meta);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error("indexedDB meta put failed"));
  });
}

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

function requestToPromise<T>(request: IDBRequest<T>, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error(message));
  });
}

async function removeOlderRowsForItem(
  itemIndex: IDBIndex,
  threadId: string,
  itemId: string,
  keepDisplaySeq: number,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const range = IDBKeyRange.only([threadId, itemId]);
    const cursorRequest = itemIndex.openCursor(range);
    cursorRequest.onerror = () =>
      reject(cursorRequest.error ?? new Error("indexedDB stale row scan failed"));
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result as IDBCursorWithValue | null;
      if (!cursor) {
        resolve();
        return;
      }
      const row = cursor.value as { displaySeq?: unknown } | null;
      const rowDisplaySeq =
        row && typeof row.displaySeq === "number" && Number.isFinite(row.displaySeq)
          ? row.displaySeq
          : null;
      if (rowDisplaySeq !== keepDisplaySeq) {
        const deleteRequest = cursor.delete();
        deleteRequest.onerror = () =>
          reject(deleteRequest.error ?? new Error("indexedDB stale row delete failed"));
        deleteRequest.onsuccess = () => cursor.continue();
        return;
      }
      cursor.continue();
    };
  });
}

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

async function loadItemsTail(threadId: string, limit: number): Promise<UiTimelineItem[]> {
  const normalizedLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
  if (normalizedLimit <= 0) {
    return [];
  }
  const db = await openCacheDb();
  return await new Promise<UiTimelineItem[]>((resolve, reject) => {
    const items: UiTimelineItem[] = [];
    const seenIds = new Set<string>();
    const tx = db.transaction(STORE_ITEMS, "readonly");
    const store = tx.objectStore(STORE_ITEMS);
    const range = IDBKeyRange.bound([threadId, -1], [threadId, Number.MAX_SAFE_INTEGER]);
    const req = store.openCursor(range, "prev");
    req.onerror = () => reject(req.error ?? new Error("indexedDB cursor failed"));
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

async function loadItemsBefore(threadId: string, beforeDisplaySeq: number, limit: number): Promise<UiTimelineItem[]> {
  const normalizedLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
  if (normalizedLimit <= 0) {
    return [];
  }
  const before = Number.isFinite(beforeDisplaySeq) ? Math.floor(beforeDisplaySeq) : 0;
  if (before <= 0) {
    return [];
  }
  const db = await openCacheDb();
  return await new Promise<UiTimelineItem[]>((resolve, reject) => {
    const items: UiTimelineItem[] = [];
    const seenIds = new Set<string>();
    const tx = db.transaction(STORE_ITEMS, "readonly");
    const store = tx.objectStore(STORE_ITEMS);
    const range = IDBKeyRange.bound([threadId, -1], [threadId, before - 1]);
    const req = store.openCursor(range, "prev");
    req.onerror = () => reject(req.error ?? new Error("indexedDB cursor failed"));
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

export async function clearThreadTimeline(params: {
  threadId: string;
}): Promise<ThreadTimelinePersistResult> {
  const normalizedThreadId = params.threadId.trim();
  if (!normalizedThreadId) return { ok: false, error: "Missing threadId" };

  try {
    const db = await openCacheDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_ITEMS, STORE_META], "readwrite");
      const itemsStore = tx.objectStore(STORE_ITEMS);
      const metaStore = tx.objectStore(STORE_META);

      metaStore.delete(normalizedThreadId);

      const range = IDBKeyRange.bound([normalizedThreadId, -1], [normalizedThreadId, Number.MAX_SAFE_INTEGER]);
      const req = itemsStore.openCursor(range);
      req.onerror = () => reject(req.error ?? new Error("indexedDB cursor failed"));
      req.onsuccess = () => {
        const cursor = req.result as IDBCursorWithValue | null;
        if (!cursor) {
          return;
        }
        cursor.delete();
        cursor.continue();
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("indexedDB transaction failed"));
      tx.onabort = () => reject(tx.error ?? new Error("indexedDB transaction aborted"));
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to clear thread timeline" };
  }
}

export async function loadThreadTimelineMeta(threadId: string): Promise<ThreadTimelineMeta | null> {
  const normalizedThreadId = threadId.trim();
  if (!normalizedThreadId) return null;
  return await getMeta(normalizedThreadId);
}

export async function saveThreadTimelineMeta(threadId: string, patch: Partial<ThreadTimelineMeta>): Promise<ThreadTimelinePersistResult> {
  const normalizedThreadId = threadId.trim();
  if (!normalizedThreadId) return { ok: false, error: "Missing threadId" };
  try {
    const existing = await getMeta(normalizedThreadId);
    const merged: ThreadTimelineMeta = {
      threadId: normalizedThreadId,
      cachedAtIso: new Date().toISOString(),
      durableCount: typeof patch.durableCount === "number" ? patch.durableCount : (existing?.durableCount ?? 0),
      maxDisplaySeq: typeof patch.maxDisplaySeq === "number" ? patch.maxDisplaySeq : (existing?.maxDisplaySeq ?? 0),
    };
    await putMeta(merged);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to persist meta" };
  }
}

export async function appendThreadTimelineItems(params: {
  threadId: string;
  items: UiTimelineItem[];
  durableCount?: number;
}): Promise<ThreadTimelinePersistResult> {
  const normalizedThreadId = params.threadId.trim();
  if (!normalizedThreadId) return { ok: false, error: "Missing threadId" };

  const persistable = dedupePersistableItemsById(
    params.items
      .map(asPersistableItem)
      .filter((item): item is PersistableTimelineItem => Boolean(item)),
  );
  if (persistable.length === 0 && typeof params.durableCount !== "number") {
    return { ok: true };
  }

  try {
    const db = await openCacheDb();
    const nowIso = new Date().toISOString();
    const maxDisplaySeq = persistable.reduce((max, item) => Math.max(max, item.displaySeq), 0);

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_ITEMS, STORE_META], "readwrite");
      const itemsStore = tx.objectStore(STORE_ITEMS);
      const metaStore = tx.objectStore(STORE_META);
      const itemIndex = itemsStore.indexNames.contains(STORE_ITEMS_INDEX_BY_THREAD_ITEM_ID)
        ? itemsStore.index(STORE_ITEMS_INDEX_BY_THREAD_ITEM_ID)
        : null;

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("indexedDB transaction failed"));
      tx.onabort = () => reject(tx.error ?? new Error("indexedDB transaction aborted"));

      void (async () => {
        if (itemIndex) {
          for (const item of persistable) {
            await removeOlderRowsForItem(
              itemIndex,
              normalizedThreadId,
              item.id,
              item.displaySeq,
            );
          }
        }
        for (const item of persistable) {
          itemsStore.put({
            threadId: normalizedThreadId,
            displaySeq: item.displaySeq,
            id: item.id,
            item,
          });
        }

        const existing =
          (await requestToPromise(
            metaStore.get(normalizedThreadId),
            "indexedDB meta get failed",
          ) as Partial<ThreadTimelineMeta> | undefined) ?? null;
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
            typeof existing?.maxDisplaySeq === "number" ? existing.maxDisplaySeq : 0,
            maxDisplaySeq,
          ),
        };
        metaStore.put(next);
      })().catch(() => {
        try {
          tx.abort();
        } catch {
          // no-op: transaction already closed
        }
      });
    });

    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to persist items" };
  }
}

export async function loadThreadTimelineTailWindow(params: {
  threadId: string;
  limit: number;
}): Promise<{ meta: ThreadTimelineMeta | null; items: UiTimelineItem[] }> {
  const normalizedThreadId = params.threadId.trim();
  if (!normalizedThreadId) return { meta: null, items: [] };
  const [meta, items] = await Promise.all([getMeta(normalizedThreadId), loadItemsTail(normalizedThreadId, params.limit)]);
  return { meta, items };
}

export async function loadThreadTimelineBeforeWindow(params: {
  threadId: string;
  beforeDisplaySeq: number;
  limit: number;
}): Promise<{ meta: ThreadTimelineMeta | null; items: UiTimelineItem[] }> {
  const normalizedThreadId = params.threadId.trim();
  if (!normalizedThreadId) return { meta: null, items: [] };
  const [meta, items] = await Promise.all([getMeta(normalizedThreadId), loadItemsBefore(normalizedThreadId, params.beforeDisplaySeq, params.limit)]);
  return { meta, items };
}
