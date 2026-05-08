import { STORE_LARGE_PAYLOAD, openCacheDb } from "./ThreadTimelineCache";

export type LargePayloadKind =
  | "exec_output"
  | "tool_details"
  | "raw_payload"
  | "mcp_result";

type LargePayloadRow = {
  threadId: string;
  itemId: string;
  kind: LargePayloadKind;
  cachedAtIso: string;
  payload: string;
};

export type LargePayloadPersistResult = { ok: true } | { ok: false; error: string };

export async function putLargePayload(params: {
  threadId: string;
  itemId: string;
  kind: LargePayloadKind;
  payload: string;
}): Promise<LargePayloadPersistResult> {
  const threadId = params.threadId.trim();
  const itemId = params.itemId.trim();
  if (!threadId) return { ok: false, error: "Missing threadId" };
  if (!itemId) return { ok: false, error: "Missing itemId" };

  try {
    const db = await openCacheDb();
    const row: LargePayloadRow = {
      threadId,
      itemId,
      kind: params.kind,
      cachedAtIso: new Date().toISOString(),
      payload: params.payload,
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_LARGE_PAYLOAD, "readwrite");
      const store = tx.objectStore(STORE_LARGE_PAYLOAD);
      const req = store.put(row);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error ?? new Error("indexedDB put failed"));
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to persist payload" };
  }
}

export async function getLargePayload(params: {
  threadId: string;
  itemId: string;
  kind: LargePayloadKind;
}): Promise<string | null> {
  const threadId = params.threadId.trim();
  const itemId = params.itemId.trim();
  if (!threadId) return null;
  if (!itemId) return null;

  try {
    const db = await openCacheDb();
    return await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(STORE_LARGE_PAYLOAD, "readonly");
      const store = tx.objectStore(STORE_LARGE_PAYLOAD);
      const req = store.get([threadId, itemId, params.kind]);
      req.onsuccess = () => {
        const row = req.result as Partial<LargePayloadRow> | undefined;
        if (!row || typeof row.payload !== "string") {
          resolve(null);
          return;
        }
        resolve(row.payload);
      };
      req.onerror = () => reject(req.error ?? new Error("indexedDB get failed"));
    });
  } catch {
    return null;
  }
}

