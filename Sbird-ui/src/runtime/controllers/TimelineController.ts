import type {
  ThreadSummary,
  UiTimelineItem,
  UiTimelineSnapshot,
} from "../../api/contracts";
import {
  countHistoryItems,
  fromSnapshot,
  type TimelineMutableState,
} from "../../domain/timeline";
import { getLargePayload, putLargePayload } from "../LargePayloadStore";
import {
  appendThreadTimelineItems,
  clearThreadTimeline,
  loadThreadTimelineBeforeWindow,
  loadThreadTimelineMeta,
  loadThreadTimelineTailWindow,
} from "../ThreadTimelineCache";
import {
  DEFAULT_TIMELINE_WINDOW_LIMIT,
  MAX_TIMELINE_WINDOW_LIMIT,
  TIMELINE_WINDOW_PAGE_SIZE,
  windowTimelineItems,
} from "../TimelineWindowing";

const LARGE_PAYLOAD_THRESHOLD_CHARS = 24000;
const LARGE_PAYLOAD_PREVIEW_HEAD_CHARS = 8000;
const LARGE_PAYLOAD_PREVIEW_TAIL_CHARS = 2000;
const TIMELINE_PERSIST_DELAY_MS = 750;

type TimelineControllerState = {
  threads: ThreadSummary[];
  timelineByThreadId: Record<string, TimelineMutableState>;
  warning: string;
};

type TimelineControllerPatch = Partial<{
  threads: ThreadSummary[];
  timelineByThreadId: Record<string, TimelineMutableState>;
  error: string;
  warning: string;
}>;

export type TimelineControllerOptions = {
  getState: () => TimelineControllerState;
  patchState: (patch: TimelineControllerPatch) => void;
  syncThreadListInProgress: (
    threadId: string,
    inProgress: boolean,
  ) => ThreadSummary[] | null;
  withClientQueuedCount: (
    threadId: string,
    snapshot: UiTimelineSnapshot,
  ) => UiTimelineSnapshot;
};

function createEmptyTimeline(threadId: string): TimelineMutableState {
  return fromSnapshot({
    threadId,
    runtime: {
      inProgress: false,
      queuedCount: 0,
      activeTurnId: null,
      interruptRequested: false,
      lastError: null,
    },
    pendingRequests: [],
    pendingRequestSetVersion: 0,
    requestSetVersion: 0,
    items: [],
    requestedCount: 0,
    totalCount: 0,
    historyReset: false,
  });
}

function sortTimelineItems(items: UiTimelineItem[]): UiTimelineItem[] {
  return [...items].sort((left, right) => {
    const leftSeq =
      typeof left.displaySeq === "number" ? left.displaySeq : Number.MAX_SAFE_INTEGER;
    const rightSeq =
      typeof right.displaySeq === "number" ? right.displaySeq : Number.MAX_SAFE_INTEGER;
    if (leftSeq !== rightSeq) {
      return leftSeq - rightSeq;
    }
    return left.id.localeCompare(right.id);
  });
}

function preferLiveTimelineItem(
  baseline: UiTimelineItem,
  live: UiTimelineItem,
): UiTimelineItem {
  const merged: UiTimelineItem = {
    ...baseline,
    ...live,
  };
  if (baseline.displaySeq !== undefined) {
    merged.displaySeq = baseline.displaySeq;
  }
  if (live.turnIndex === undefined && baseline.turnIndex !== undefined) {
    merged.turnIndex = baseline.turnIndex;
  }
  if ((!live.turnId || !live.turnId.trim()) && baseline.turnId) {
    merged.turnId = baseline.turnId;
  }
  if ((!live.createdAtIso || !live.createdAtIso.trim()) && baseline.createdAtIso) {
    merged.createdAtIso = baseline.createdAtIso;
  }
  if (baseline.completed && !live.completed) {
    merged.completed = true;
    if (
      baseline.status &&
      (!live.status || live.status === "inProgress")
    ) {
      merged.status = baseline.status;
    }
  }
  if (!merged.text && baseline.text) {
    merged.text = baseline.text;
  }
  if (!live.commandExecution && baseline.commandExecution) {
    merged.commandExecution = baseline.commandExecution;
  }
  if (!live.mcpToolCall && baseline.mcpToolCall) {
    merged.mcpToolCall = baseline.mcpToolCall;
  }
  if (!live.toolCall && baseline.toolCall) {
    merged.toolCall = baseline.toolCall;
  }
  return merged;
}

function mergeTimelineItems(
  baselineItems: UiTimelineItem[],
  liveItems: UiTimelineItem[],
): UiTimelineItem[] {
  const mergedById = new Map<string, UiTimelineItem>();
  for (const item of baselineItems) {
    mergedById.set(item.id, item);
  }
  for (const item of liveItems) {
    const existing = mergedById.get(item.id);
    mergedById.set(item.id, existing ? preferLiveTimelineItem(existing, item) : item);
  }
  return sortTimelineItems([...mergedById.values()]);
}

function truncateLargeText(value: string): string {
  if (value.length <= LARGE_PAYLOAD_THRESHOLD_CHARS) {
    return value;
  }
  const head = value.slice(0, LARGE_PAYLOAD_PREVIEW_HEAD_CHARS);
  const tail = value.slice(-LARGE_PAYLOAD_PREVIEW_TAIL_CHARS);
  const omitted = Math.max(0, value.length - head.length - tail.length);
  return `${head}\n\n[... truncated ${omitted} chars ...]\n\n${tail}`;
}

export class TimelineController {
  private readonly timelinePersistTimerByThreadId: Record<string, number> = {};
  private readonly timelineWindowLimitByThreadId: Record<string, number> = {};

  constructor(private readonly options: TimelineControllerOptions) {}

  public dispose(): void {
    this.clearAllPersistTimers();
  }

  public applyTimelineWindow(
    threadId: string,
    snapshot: UiTimelineSnapshot,
  ): UiTimelineSnapshot {
    return {
      ...snapshot,
      items: windowTimelineItems(snapshot.items ?? [], this.timelineWindowLimit(threadId)),
    };
  }

  public upsertTimeline(threadId: string): TimelineMutableState {
    const current = this.options.getState().timelineByThreadId[threadId];
    if (current) {
      return current;
    }
    const created = createEmptyTimeline(threadId);
    this.patchTimelineState(threadId, created);
    return created;
  }

  public patchTimelineState(
    threadId: string,
    timeline: TimelineMutableState,
    patch: TimelineControllerPatch = {},
  ): void {
    const state = this.options.getState();
    const timelineByThreadId = {
      ...state.timelineByThreadId,
      [threadId]: timeline,
    };
    const syncedThreads = this.options.syncThreadListInProgress(
      threadId,
      timeline.runtime.inProgress,
    );
    this.options.patchState(
      syncedThreads
        ? {
            ...patch,
            timelineByThreadId,
            threads: syncedThreads,
          }
        : {
            ...patch,
            timelineByThreadId,
          },
    );
    this.schedulePersistTimeline(threadId);
  }

  public async loadOlder(threadId: string): Promise<void> {
    const normalizedThreadId = threadId.trim();
    if (!normalizedThreadId) return;

    const current = this.options.getState().timelineByThreadId[normalizedThreadId];
    if (!current || current.items.length === 0) {
      return;
    }

    let beforeDisplaySeq = Number.POSITIVE_INFINITY;
    for (const item of current.items) {
      if (typeof item.displaySeq !== "number" || !Number.isFinite(item.displaySeq)) {
        continue;
      }
      beforeDisplaySeq = Math.min(beforeDisplaySeq, item.displaySeq);
    }
    if (!Number.isFinite(beforeDisplaySeq) || beforeDisplaySeq === Number.POSITIVE_INFINITY) {
      return;
    }

    // Expand the in-memory window gradually as the user scrolls up.
    this.bumpTimelineWindowLimit(normalizedThreadId, TIMELINE_WINDOW_PAGE_SIZE);

    try {
      const older = await loadThreadTimelineBeforeWindow({
        threadId: normalizedThreadId,
        beforeDisplaySeq,
        limit: TIMELINE_WINDOW_PAGE_SIZE,
      });
      if (older.items.length === 0) {
        return;
      }
      const mergedItems = mergeTimelineItems(older.items, current.items);
      const next = this.applyTimelineWindow(normalizedThreadId, {
        ...current,
        items: mergedItems,
      });
      this.patchTimelineState(normalizedThreadId, next);
    } catch (error) {
      this.options.patchState({
        error: error instanceof Error ? error.message : "Failed to load older history",
      });
    }
  }

  public async hydrateLargePayload(threadId: string, itemId: string): Promise<void> {
    const normalizedThreadId = threadId.trim();
    const normalizedItemId = itemId.trim();
    if (!normalizedThreadId) return;
    if (!normalizedItemId) return;

    const current = this.options.getState().timelineByThreadId[normalizedThreadId];
    if (!current) return;

    const index = current.items.findIndex((item) => item.id === normalizedItemId);
    if (index < 0) return;

    const item = current.items[index];
    let changed = false;
    let nextItem: UiTimelineItem = item;

    if (item.commandExecution?.outputTruncated) {
      const full = await getLargePayload({
        threadId: normalizedThreadId,
        itemId: normalizedItemId,
        kind: "exec_output",
      });
      if (typeof full === "string" && full.length > 0) {
        nextItem = {
          ...nextItem,
          commandExecution: {
            ...item.commandExecution,
            aggregatedOutput: full,
            outputTruncated: false,
          },
        };
        changed = true;
      }
    }

    if (item.rawPayloadTruncated) {
      const full = await getLargePayload({
        threadId: normalizedThreadId,
        itemId: normalizedItemId,
        kind: "raw_payload",
      });
      if (typeof full === "string" && full.length > 0) {
        nextItem = {
          ...nextItem,
          rawPayload: full,
          rawPayloadTruncated: false,
        };
        changed = true;
      }
    }

    if (item.toolCall?.detailsTruncated) {
      const full = await getLargePayload({
        threadId: normalizedThreadId,
        itemId: normalizedItemId,
        kind: "tool_details",
      });
      if (typeof full === "string" && full.length > 0) {
        let parsed: unknown = full;
        try {
          parsed = JSON.parse(full);
        } catch {
          // keep string
        }
        nextItem = {
          ...nextItem,
          toolCall: {
            ...item.toolCall,
            details: parsed,
            detailsTruncated: false,
          },
        };
        changed = true;
      }
    }

    if (!changed) return;
    const nextItems = [...current.items];
    nextItems[index] = nextItem;
    const next = this.applyTimelineWindow(normalizedThreadId, {
      ...current,
      items: nextItems,
    });
    this.patchTimelineState(normalizedThreadId, next);
  }

  public detachLargePayloads(threadId: string, items: UiTimelineItem[]): UiTimelineItem[] {
    const normalizedThreadId = threadId.trim();
    if (!normalizedThreadId) return items;

    let changed = false;
    const nextItems = items.map((item) => {
      let next: UiTimelineItem = item;

      if (
        item.commandExecution &&
        item.commandExecution.status !== "inProgress" &&
        !item.commandExecution.outputTruncated &&
        (item.commandExecution.aggregatedOutput ?? "").length > LARGE_PAYLOAD_THRESHOLD_CHARS
      ) {
        const full = item.commandExecution.aggregatedOutput ?? "";
        void putLargePayload({
          threadId: normalizedThreadId,
          itemId: item.id,
          kind: "exec_output",
          payload: full,
        }).then((result) => {
          if (!result.ok) {
            this.setWarningOnce(
              `Browser storage quota hit: large exec outputs won't be cached (${result.error}).`,
            );
          }
        });
        next = {
          ...next,
          commandExecution: {
            ...item.commandExecution,
            aggregatedOutput: truncateLargeText(full),
            outputTruncated: true,
          },
        };
        changed = true;
      }

      if (
        typeof next.rawPayload === "string" &&
        next.rawPayload.length > LARGE_PAYLOAD_THRESHOLD_CHARS &&
        !next.rawPayloadTruncated
      ) {
        const full = next.rawPayload;
        void putLargePayload({
          threadId: normalizedThreadId,
          itemId: item.id,
          kind: "raw_payload",
          payload: full,
        }).then((result) => {
          if (!result.ok) {
            this.setWarningOnce(
              `Browser storage quota hit: large payloads won't be cached (${result.error}).`,
            );
          }
        });
        next = {
          ...next,
          rawPayload: truncateLargeText(full),
          rawPayloadTruncated: true,
        };
        changed = true;
      }

      if (next.toolCall?.details !== undefined && !next.toolCall.detailsTruncated) {
        const details = next.toolCall.details;
        let serialized = "";
        try {
          serialized = JSON.stringify(details);
        } catch {
          serialized = String(details);
        }
        if (serialized.length > LARGE_PAYLOAD_THRESHOLD_CHARS) {
          void putLargePayload({
            threadId: normalizedThreadId,
            itemId: item.id,
            kind: "tool_details",
            payload: serialized,
          }).then((result) => {
            if (!result.ok) {
              this.setWarningOnce(
                `Browser storage quota hit: large tool details won't be cached (${result.error}).`,
              );
            }
          });
          next = {
            ...next,
            toolCall: {
              ...next.toolCall,
              details: truncateLargeText(serialized),
              detailsTruncated: true,
            },
          };
          changed = true;
        }
      }

      return next;
    });

    return changed ? nextItems : items;
  }

  public async hydrateThreadTimelineFromCache(
    threadId: string,
    shouldApply?: () => boolean,
  ): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }
    if (shouldApply && !shouldApply()) {
      return;
    }
    const existing = this.options.getState().timelineByThreadId[threadId];
    if (existing && existing.items.length > 0) {
      return;
    }

    const cachedWindow = await loadThreadTimelineTailWindow({
      threadId,
      limit: this.timelineWindowLimit(threadId),
    });
    if (cachedWindow.items.length > 0) {
      if (shouldApply && !shouldApply()) {
        return;
      }
      const empty = createEmptyTimeline(threadId);
      const hydrated = this.options.withClientQueuedCount(threadId, {
        ...empty,
        items: cachedWindow.items,
        totalCount:
          cachedWindow.meta?.durableCount ??
          (typeof empty.totalCount === "number" ? empty.totalCount : countHistoryItems(cachedWindow.items)),
      });
      this.patchTimelineState(threadId, hydrated);
      return;
    }

  }

  public persistBaselineSnapshotToCache(
    threadId: string,
    snapshot: UiTimelineSnapshot,
  ): void {
    const normalizedThreadId = threadId.trim();
    if (!normalizedThreadId) return;

    const durableCount =
      typeof snapshot.totalCount === "number" && Number.isFinite(snapshot.totalCount)
        ? Math.max(0, Math.trunc(snapshot.totalCount))
        : countHistoryItems(snapshot.items);

    if (snapshot.historyReset) {
      void (async () => {
        await clearThreadTimeline({ threadId: normalizedThreadId });
        const persistItems = this.detachLargePayloads(normalizedThreadId, snapshot.items);
        await appendThreadTimelineItems({
          threadId: normalizedThreadId,
          items: persistItems,
          durableCount,
        });
      })();
      return;
    }

    const persistItems = this.detachLargePayloads(normalizedThreadId, snapshot.items);
    void appendThreadTimelineItems({
      threadId: normalizedThreadId,
      items: persistItems,
      durableCount,
    });
  }

  public async getCachedDurableCount(threadId: string): Promise<number | null> {
    const meta = await loadThreadTimelineMeta(threadId);
    if (!meta) {
      return null;
    }
    return Math.max(0, Math.trunc(meta.durableCount));
  }

  public appendOptimisticUserMessage(
    threadId: string,
    text: string,
  ): string | null {
    const current = this.upsertTimeline(threadId);
    const normalizedText = text.trim();
    if (!normalizedText) {
      return null;
    }
    const maxDisplaySeq = current.items.reduce((max, item) => {
      const seq = typeof item.displaySeq === "number" ? item.displaySeq : 0;
      return seq > max ? seq : max;
    }, 0);

    const optimisticItemId =
      `user-local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticItem = {
      id: optimisticItemId,
      itemType: "user-message" as const,
      role: "user" as const,
      text: normalizedText,
      completed: true,
      status: "completed",
      createdAtIso: new Date().toISOString(),
      displaySeq: maxDisplaySeq + 1,
    };

    const next = fromSnapshot({
      ...current,
      items: [...current.items, optimisticItem],
    });
    this.patchTimelineState(threadId, next);
    return optimisticItemId;
  }

  public removeTimelineItem(threadId: string, itemId: string): void {
    const normalizedItemId = itemId.trim();
    if (!normalizedItemId) {
      return;
    }
    const current = this.options.getState().timelineByThreadId[threadId];
    if (!current) {
      return;
    }
    const items = current.items.filter((item) => item.id !== normalizedItemId);
    if (items.length === current.items.length) {
      return;
    }
    const next = fromSnapshot({
      ...current,
      items,
    });
    this.patchTimelineState(threadId, next);
  }

  private timelineWindowLimit(threadId: string): number {
    const normalizedThreadId = threadId.trim();
    if (!normalizedThreadId) return DEFAULT_TIMELINE_WINDOW_LIMIT;
    const stored = this.timelineWindowLimitByThreadId[normalizedThreadId];
    if (typeof stored === "number" && Number.isFinite(stored) && stored > 0) {
      return Math.min(MAX_TIMELINE_WINDOW_LIMIT, Math.floor(stored));
    }
    return DEFAULT_TIMELINE_WINDOW_LIMIT;
  }

  private bumpTimelineWindowLimit(threadId: string, delta: number): number {
    const normalizedThreadId = threadId.trim();
    if (!normalizedThreadId) return DEFAULT_TIMELINE_WINDOW_LIMIT;
    const current = this.timelineWindowLimit(threadId);
    const next = Math.min(MAX_TIMELINE_WINDOW_LIMIT, Math.max(1, current + delta));
    this.timelineWindowLimitByThreadId[normalizedThreadId] = next;
    return next;
  }

  private setWarningOnce(message: string): void {
    const normalized = message.trim();
    if (!normalized) return;
    if (this.options.getState().warning === normalized) return;
    this.options.patchState({ warning: normalized });
  }

  private schedulePersistTimeline(threadId: string): void {
    if (typeof window === "undefined") {
      return;
    }
    const normalizedThreadId = threadId.trim();
    if (!normalizedThreadId) {
      return;
    }
    const existing = this.timelinePersistTimerByThreadId[normalizedThreadId];
    if (existing) {
      window.clearTimeout(existing);
    }
    this.timelinePersistTimerByThreadId[normalizedThreadId] = window.setTimeout(() => {
      delete this.timelinePersistTimerByThreadId[normalizedThreadId];
      const current = this.options.getState().timelineByThreadId[normalizedThreadId];
      if (!current) {
        return;
      }
      const durableCount =
        typeof current.totalCount === "number" && Number.isFinite(current.totalCount)
          ? Math.max(0, Math.trunc(current.totalCount))
          : countHistoryItems(current.items);
      const persistItems = this.detachLargePayloads(normalizedThreadId, current.items);
      void appendThreadTimelineItems({
        threadId: normalizedThreadId,
        items: persistItems,
        durableCount,
      });
    }, TIMELINE_PERSIST_DELAY_MS);
  }

  private clearAllPersistTimers(): void {
    if (typeof window === "undefined") {
      return;
    }
    for (const timerId of Object.values(this.timelinePersistTimerByThreadId)) {
      window.clearTimeout(timerId);
    }
    for (const key of Object.keys(this.timelinePersistTimerByThreadId)) {
      delete this.timelinePersistTimerByThreadId[key];
    }
  }
}
