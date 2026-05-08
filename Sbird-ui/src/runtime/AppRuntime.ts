import {
  applyTimelineEvent as reduceTimelineEvent,
  countHistoryItems,
  fromSnapshot,
  isCountableHistoryItem,
  normalizeTimelineItem,
  type TimelineMutableState,
} from "../domain/timeline";
import type {
  ThreadSendMode,
  ThreadSummary,
  UiTimelineItem,
  UiServerRequest,
  UiTimelineEvent,
  UiTimelineSnapshot,
} from "../api/contracts";
import type { ServerRequestReply } from "../domain/server-request";
import { AppEventSender } from "./internal/app_event_sender";
import type { AppEventHandler } from "./internal/app_event";
import { createDefaultAppServerSession } from "./internal/app_server_adapter";
import {
  AppServerSession,
  type ThreadSessionState,
} from "./AppServerSession";
import { LiveSyncController } from "./controllers/LiveSyncController";
import { ThreadCatalogController } from "./controllers/ThreadCatalogController";
import { TimelineController } from "./controllers/TimelineController";
import {
  TurnController,
  type TurnServerRequestReplyOutcome,
} from "./controllers/TurnController";
import type { PendingInputEntry } from "../domain/input";

const STREAM_CONTROL_GRACE_TIMEOUT_MS = 1500;
const BACKFILL_DONE_TIMEOUT_MS = 15000;

export type ThreadSyncPhase = "hydrating" | "live" | "resync_required" | "live_degraded";

export type ThreadSyncState = {
  phase: ThreadSyncPhase;
  reason?: string;
  updatedAtIso: string;
};

type RuntimeFlags = {
  loadingThreads: boolean;
  loadingSnapshot: boolean;
  streamConnected: boolean;
  sending: boolean;
  interrupting: boolean;
};

export type AppRuntimeState = {
  threads: ThreadSummary[];
  selectedThreadId: string;
  projectDisplayNameById: Record<string, string>;
  timelineByThreadId: Record<string, TimelineMutableState>;
  syncByThreadId: Record<string, ThreadSyncState>;
  error: string;
  warning: string;
  flags: RuntimeFlags;
};

export type ServerRequestReplyOutcome = TurnServerRequestReplyOutcome;

type RuntimeListener = (state: AppRuntimeState) => void;

function emptyRuntimeFlags(): RuntimeFlags {
  return {
    loadingThreads: false,
    loadingSnapshot: false,
    streamConnected: false,
    sending: false,
    interrupting: false,
  };
}

function initialState(): AppRuntimeState {
  return {
    threads: [],
    selectedThreadId: "",
    projectDisplayNameById: {},
    timelineByThreadId: {},
    syncByThreadId: {},
    error: "",
    warning: "",
    flags: emptyRuntimeFlags(),
  };
}

function timelineFromSnapshot(snapshot: UiTimelineSnapshot): TimelineMutableState {
  return fromSnapshot(snapshot);
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

function sortPendingRequests(requests: UiServerRequest[]): UiServerRequest[] {
  return [...requests].sort((left, right) => {
    const leftSeq =
      typeof left.displaySeq === "number" ? left.displaySeq : Number.MAX_SAFE_INTEGER;
    const rightSeq =
      typeof right.displaySeq === "number" ? right.displaySeq : Number.MAX_SAFE_INTEGER;
    if (leftSeq !== rightSeq) {
      return leftSeq - rightSeq;
    }
    return left.id - right.id;
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
  // Preserve the insertion order for an item once it has been assigned.
  // TUI does not reorder transcript cells when a later delta/completion arrives.
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

function mergePendingRequests(
  baselineRequests: UiServerRequest[],
  liveRequests: UiServerRequest[],
): UiServerRequest[] {
  const mergedById = new Map<number, UiServerRequest>();
  for (const request of baselineRequests) {
    mergedById.set(request.id, request);
  }
  for (const request of liveRequests) {
    const existing = mergedById.get(request.id);
    mergedById.set(
      request.id,
      existing
        ? {
            ...existing,
            ...request,
          }
        : request,
    );
  }
  return sortPendingRequests([...mergedById.values()]);
}

function runtimeFromThreadSession(session: ThreadSessionState): UiTimelineSnapshot["runtime"] {
  return {
    inProgress: Boolean(session.inProgress),
    queuedCount: 0,
    activeTurnId: session.activeTurnId ?? null,
    interruptRequested: false,
    lastError: null,
  };
}

export class AppRuntime {
  private readonly listeners = new Set<RuntimeListener>();
  private readonly events = new AppEventSender();
  private readonly session: AppServerSession;
  private readonly timeline: TimelineController;
  private readonly liveSync: LiveSyncController;
  private readonly turn: TurnController;
  private readonly threadCatalog: ThreadCatalogController;
  private state: AppRuntimeState = initialState();

  private loadingSnapshotRequests = 0;
  private readonly refreshSequenceByRunId: Record<string, number> = {};
  private readonly refreshReasonByRunId: Record<string, string> = {};
  private readonly resyncInFlightByThreadId: Record<string, boolean> = {};
  private readonly pendingBackfillByThreadId: Record<string, boolean> = {};
  private readonly streamControlSeenByThreadId: Record<string, boolean> = {};
  private readonly streamControlGraceTimerByThreadId: Record<string, number> = {};
  private readonly backfillDoneTimerByThreadId: Record<string, number> = {};

  constructor(session: AppServerSession = createDefaultAppServerSession()) {
    this.session = session;
    this.turn = new TurnController({
      session: this.session,
      getState: () => this.state,
      emitEvent: (event) => this.events.send(event),
      patchState: (patch) => this.patchState(patch),
      patchFlags: (patch) => this.patchFlags(patch),
      isSendBlockedBySync: (threadId) => this.isSendBlockedBySync(threadId),
      resolveRunIdForThread: (threadId) => this.resolveRunIdForThread(threadId),
      refreshRunState: (runId, reason) => this.refreshRunState(runId, reason),
      upsertTimeline: (threadId) => this.upsertTimeline(threadId),
      patchTimelineState: (threadId, timeline) =>
        this.patchTimelineState(threadId, timeline),
      appendOptimisticUserMessage: (threadId, text) =>
        this.timeline.appendOptimisticUserMessage(threadId, text),
      removeTimelineItem: (threadId, itemId) =>
        this.timeline.removeTimelineItem(threadId, itemId),
    });
    this.timeline = new TimelineController({
      getState: () => this.state,
      patchState: (patch) => this.patchState(patch),
      syncThreadListInProgress: (threadId, inProgress) =>
        this.syncThreadListInProgress(threadId, inProgress),
      withClientQueuedCount: (threadId, snapshot) =>
        this.turn.withClientQueuedCount(threadId, snapshot),
    });
    this.liveSync = new LiveSyncController({
      session: this.session,
      getSelectedThreadId: () => this.state.selectedThreadId,
      patchState: (patch) => this.patchState(patch),
      patchFlags: (patch) => this.patchFlags(patch),
      upsertTimeline: (threadId) => {
        this.timeline.upsertTimeline(threadId);
      },
      applyThreadEvent: (threadId, event) => this.applyThreadEvent(threadId, event),
      refreshRunState: (runId, reason) => this.refreshRunState(runId, reason),
      setThreadSyncPhase: (threadId, phase, reason) =>
        this.setThreadSyncPhase(threadId, phase, reason),
      getThreadSyncPhase: (threadId) => this.getThreadSyncPhase(threadId),
      resolveRunIdForThread: (threadId) => this.resolveRunIdForThread(threadId),
      onStreamOpenedForThread: (threadId) => {
        this.streamControlSeenByThreadId[threadId] = false;
        this.scheduleStreamControlGraceTimeout(threadId);
      },
      sendStreamDisconnected: (threadId, reason) => {
        this.events.send({ type: "stream_disconnected", threadId, reason });
      },
    });
    this.threadCatalog = new ThreadCatalogController({
      session: this.session,
      getState: () => this.state,
      patchState: (patch) => this.patchState(patch),
      patchFlags: (patch) => this.patchFlags(patch),
      emitEvent: (event) => this.events.send(event),
      hydrateThreadTimelineFromCache: (threadId, shouldApply) =>
        this.hydrateThreadTimelineFromCache(threadId, shouldApply),
      isConnectedToRun: (runId) => this.liveSync.isConnectedToRun(runId),
      connectStreamAndRefreshRun: (runId, options) =>
        this.liveSync.connectStreamAndRefreshRun(runId, options),
      getThreadSyncPhase: (threadId) => this.getThreadSyncPhase(threadId),
    });
  }

  public setThreadTurnOverrides(
    threadId: string,
    overrides: { model?: string | null; effort?: string | null },
  ): void {
    const normalized = threadId.trim();
    if (!normalized) return;
    void this.session.turnContextOverride(normalized, overrides).catch((error) => {
      this.patchState({
        error:
          error instanceof Error
            ? error.message
            : "Failed to override turn context",
      });
    });
  }

  public subscribe(listener: RuntimeListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public onEvent(handler: AppEventHandler): () => void {
    return this.events.subscribe(handler);
  }

  public getState(): AppRuntimeState {
    return this.state;
  }

  public listPendingInputs(threadId: string): PendingInputEntry[] {
    return this.turn.listPendingInputs(threadId);
  }

  public async bootstrap(): Promise<void> {
    await this.threadCatalog.bootstrap();
  }

  public async reloadThreadCatalog(): Promise<void> {
    await this.threadCatalog.reloadThreadCatalog();
  }

  public async selectThread(threadId: string): Promise<void> {
    await this.threadCatalog.selectThread(threadId);
  }

  public async loadOlder(threadId: string): Promise<void> {
    await this.timeline.loadOlder(threadId);
  }

  public async hydrateLargePayload(threadId: string, itemId: string): Promise<void> {
    await this.timeline.hydrateLargePayload(threadId, itemId);
  }

  public async sendMessage(
    threadId: string,
    content: string,
    mode: ThreadSendMode = "steer",
  ): Promise<void> {
    await this.turn.sendMessage(threadId, content, mode);
  }

  public async interrupt(threadId: string): Promise<void> {
    await this.turn.interrupt(threadId);
  }

  public async rollback(threadId: string, numTurns: number): Promise<void> {
    await this.turn.rollback(threadId, numTurns);
  }

  public async renameThread(threadId: string, name: string): Promise<void> {
    await this.threadCatalog.renameThread(threadId, name);
  }

  public async archiveThread(threadId: string): Promise<void> {
    await this.threadCatalog.archiveThread(threadId);
  }

  public async forkThread(threadId: string): Promise<string | undefined> {
    return await this.threadCatalog.forkThread(threadId);
  }

  public async respondServerRequest(
    threadId: string,
    request: UiServerRequest,
    reply: ServerRequestReply,
  ): Promise<ServerRequestReplyOutcome> {
    return await this.turn.respondServerRequest(threadId, request, reply);
  }

  public dispose(): void {
    this.threadCatalog.dispose();
    this.turn.dispose();
    this.timeline.dispose();
    this.liveSync.dispose();
    this.clearAllThreadSyncTimers();
  }

  private applyTimelineWindow(threadId: string, snapshot: UiTimelineSnapshot): UiTimelineSnapshot {
    return this.timeline.applyTimelineWindow(threadId, snapshot);
  }

  private detachLargePayloads(threadId: string, items: UiTimelineItem[]): UiTimelineItem[] {
    return this.timeline.detachLargePayloads(threadId, items);
  }

  private patchState(patch: Partial<AppRuntimeState>): void {
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  private patchFlags(patch: Partial<RuntimeFlags>): void {
    this.state = {
      ...this.state,
      flags: {
        ...this.state.flags,
        ...patch,
      },
    };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private upsertTimeline(threadId: string): TimelineMutableState {
    return this.timeline.upsertTimeline(threadId);
  }

  private patchTimelineState(
    threadId: string,
    timeline: TimelineMutableState,
    patch: Partial<AppRuntimeState> = {},
  ): void {
    this.timeline.patchTimelineState(threadId, timeline, patch);
  }

  private resolveSelectedThreadId(threads: ThreadSummary[]): string {
    return this.threadCatalog.resolveSelectedThreadId(threads);
  }

  private resolveRunIdForThread(threadId: string): string {
    return this.threadCatalog.resolveRunIdForThread(threadId);
  }

  private syncThreadListInProgress(
    threadId: string,
    inProgress: boolean,
  ): ThreadSummary[] | null {
    return this.threadCatalog.syncThreadListInProgress(threadId, inProgress);
  }

  private async hydrateThreadTimelineFromCache(
    threadId: string,
    shouldApply?: () => boolean,
  ): Promise<void> {
    await this.timeline.hydrateThreadTimelineFromCache(threadId, shouldApply);
  }

  private persistBaselineSnapshotToCache(threadId: string, snapshot: UiTimelineSnapshot): void {
    this.timeline.persistBaselineSnapshotToCache(threadId, snapshot);
  }

  private getThreadSyncPhase(threadId: string): ThreadSyncPhase {
    return this.state.syncByThreadId[threadId]?.phase ?? "live";
  }

  private setThreadSyncPhase(threadId: string, phase: ThreadSyncPhase, reason?: string): void {
    const current = this.state.syncByThreadId[threadId];
    if (current?.phase === phase && current.reason === reason) {
      return;
    }
    const nextState: ThreadSyncState = {
      phase,
      reason,
      updatedAtIso: new Date().toISOString(),
    };
    this.patchState({
      syncByThreadId: {
        ...this.state.syncByThreadId,
        [threadId]: nextState,
      },
    });
  }

  private isSendBlockedBySync(threadId: string): boolean {
    const phase = this.getThreadSyncPhase(threadId);
    return phase === "hydrating" || phase === "resync_required";
  }

  private clearTimer(timerId: number | undefined): void {
    if (typeof window === "undefined" || typeof timerId !== "number") {
      return;
    }
    window.clearTimeout(timerId);
  }

  private clearStreamControlGraceTimer(threadId: string): void {
    this.clearTimer(this.streamControlGraceTimerByThreadId[threadId]);
    delete this.streamControlGraceTimerByThreadId[threadId];
  }

  private clearBackfillDoneTimer(threadId: string): void {
    this.clearTimer(this.backfillDoneTimerByThreadId[threadId]);
    delete this.backfillDoneTimerByThreadId[threadId];
  }

  private clearThreadSyncTimers(threadId: string): void {
    this.clearStreamControlGraceTimer(threadId);
    this.clearBackfillDoneTimer(threadId);
    delete this.streamControlSeenByThreadId[threadId];
  }

  private clearAllThreadSyncTimers(): void {
    for (const threadId of Object.keys(this.streamControlGraceTimerByThreadId)) {
      this.clearStreamControlGraceTimer(threadId);
    }
    for (const threadId of Object.keys(this.backfillDoneTimerByThreadId)) {
      this.clearBackfillDoneTimer(threadId);
    }
    for (const threadId of Object.keys(this.streamControlSeenByThreadId)) {
      delete this.streamControlSeenByThreadId[threadId];
    }
  }

  private scheduleStreamControlGraceTimeout(threadId: string): void {
    if (typeof window === "undefined") {
      return;
    }
    this.clearStreamControlGraceTimer(threadId);
    this.streamControlGraceTimerByThreadId[threadId] = window.setTimeout(() => {
      const streamRunId = this.liveSync.getCurrentRunId();
      if (!streamRunId || this.resolveRunIdForThread(threadId) !== streamRunId) {
        return;
      }
      if (this.streamControlSeenByThreadId[threadId]) {
        return;
      }
      this.setThreadSyncPhase(threadId, "live", "stream_control_timeout");
    }, STREAM_CONTROL_GRACE_TIMEOUT_MS);
  }

  private scheduleBackfillDoneTimeout(threadId: string): void {
    if (typeof window === "undefined") {
      return;
    }
    this.clearBackfillDoneTimer(threadId);
    this.backfillDoneTimerByThreadId[threadId] = window.setTimeout(() => {
      const streamRunId = this.liveSync.getCurrentRunId();
      if (!streamRunId || this.resolveRunIdForThread(threadId) !== streamRunId) {
        return;
      }
      if (this.getThreadSyncPhase(threadId) !== "hydrating") {
        return;
      }
      this.requestThreadResync(threadId, "backfill_done_timeout", { allowDegraded: true });
    }, BACKFILL_DONE_TIMEOUT_MS);
  }

  private applyThreadSessionState(
    threadId: string,
    session: ThreadSessionState | null,
    timelineSnapshot?: UiTimelineSnapshot,
  ): void {
    const current = this.upsertTimeline(threadId);
    const baseline = timelineSnapshot ?? current;
    const historyReset = Boolean(timelineSnapshot?.historyReset);
    const optimisticItemIdsToDrop = new Set<string>();
    if (timelineSnapshot) {
      // Baseline reads can include server-rendered user messages that we might have missed via
      // arrival-order notifications, resync, or read fallback. Reconcile recent baseline user messages
      // against local optimistic/pending input to avoid duplicates.
      const recentUserTexts = new Set<string>();
      for (
        let index = timelineSnapshot.items.length - 1;
        index >= 0 && recentUserTexts.size < 20;
        index -= 1
      ) {
        const item = timelineSnapshot.items[index];
        if (item.itemType !== "user-message") {
          continue;
        }
        const text = item.text.trim();
        if (text) {
          recentUserTexts.add(text);
        }
      }

      if (recentUserTexts.size > 0) {
        const dropped = this.turn.reconcilePendingFromBaselineUserTexts(
          threadId,
          recentUserTexts,
        );
        for (const itemId of dropped) {
          optimisticItemIdsToDrop.add(itemId);
        }
      }
    }
    const mergedItems = mergeTimelineItems(
      baseline.items,
      historyReset ? [] : current.items,
    ).filter((item) => !optimisticItemIdsToDrop.has(item.id));
    const baselineTotalCount =
      typeof baseline.totalCount === "number" && Number.isFinite(baseline.totalCount)
        ? Math.max(0, Math.trunc(baseline.totalCount))
        : countHistoryItems(baseline.items);
    const mergedTotalCount = countHistoryItems(mergedItems);
    const totalCount = historyReset
      ? baselineTotalCount
      : typeof baseline.totalCount === "number" && Number.isFinite(baseline.totalCount)
        ? baselineTotalCount
        : Math.max(baselineTotalCount, mergedTotalCount);
    const requestSetVersion = Math.max(
      current.requestSetVersion ?? 0,
      baseline.requestSetVersion ?? 0,
    );
    const sessionRuntime = session ? runtimeFromThreadSession(session) : null;
    const detachedItems = this.detachLargePayloads(threadId, mergedItems);
    const snapshot: UiTimelineSnapshot = {
      ...baseline,
      threadId,
      items: detachedItems,
      pendingRequests: historyReset
        ? sortPendingRequests(baseline.pendingRequests)
        : mergePendingRequests(baseline.pendingRequests, current.pendingRequests),
      pendingRequestSetVersion: Math.max(
        current.pendingRequestSetVersion,
        baseline.pendingRequestSetVersion,
      ),
      requestSetVersion: requestSetVersion > 0 ? requestSetVersion : undefined,
      totalCount,
      historyReset: historyReset ? true : undefined,
      runtime: {
        ...current.runtime,
        ...(sessionRuntime ?? {}),
      },
    };
    const snapshotWithQueuedCount = this.turn.withClientQueuedCount(threadId, snapshot);
    const next = timelineFromSnapshot(
      this.applyTimelineWindow(threadId, snapshotWithQueuedCount),
    );
    this.patchTimelineState(threadId, next, { error: "" });
    this.events.send({ type: "snapshot_loaded", threadId, snapshot: snapshotWithQueuedCount });
    if (!next.runtime.inProgress) {
      this.turn.maybeDrainQueuedInput(threadId, "snapshot_loaded");
    }
  }

  private applyThreadEvent(threadId: string, event: UiTimelineEvent): void {
    const markControlSeen = () => {
      this.streamControlSeenByThreadId[threadId] = true;
      this.clearStreamControlGraceTimer(threadId);
    };

    if (event.eventType === "stream_backfill_started") {
      markControlSeen();
      this.setThreadSyncPhase(threadId, "hydrating", "backfill_started");
      this.scheduleBackfillDoneTimeout(threadId);
    } else if (event.eventType === "stream_backfill_completed") {
      markControlSeen();
      this.clearBackfillDoneTimer(threadId);
      this.setThreadSyncPhase(threadId, "live", "backfill_done");
    } else if (event.eventType === "stream_resync_required") {
      markControlSeen();
      this.clearBackfillDoneTimer(threadId);
      this.requestThreadResync(threadId, event.eventType, { allowDegraded: true });
    } else if (!this.streamControlSeenByThreadId[threadId]) {
      markControlSeen();
      if (this.getThreadSyncPhase(threadId) === "hydrating") {
        this.setThreadSyncPhase(threadId, "live", "implicit_live_event");
      }
    }

    const current = this.upsertTimeline(threadId);
    let reduced = reduceTimelineEvent(current, event);
    if (this.shouldForceRunningFromEvent(event)) {
      reduced = {
        ...reduced,
        runtime: {
          ...reduced.runtime,
          inProgress: true,
          interruptRequested: false,
        },
      };
    }
    const previousTotalCount =
      typeof current.totalCount === "number" && Number.isFinite(current.totalCount)
        ? Math.max(0, Math.trunc(current.totalCount))
        : countHistoryItems(current.items);

    let totalCount = previousTotalCount;
    if (event.eventType === "item_finalized") {
      const payload =
        event.payload && typeof event.payload === "object" && !Array.isArray(event.payload)
          ? (event.payload as Record<string, unknown>)
          : null;
      if (payload?.item) {
        const normalized = normalizeTimelineItem(payload.item);
        if (isCountableHistoryItem(normalized)) {
          // Treat `item/completed` as the moment the item becomes durable history.
          totalCount += 1;
        }
      }
    } else if (event.eventType === "turn_finalized") {
      const newlyInserted = reduced.items.filter(
        (item) =>
          item.id.startsWith("turn-") &&
          item.id.endsWith("-error") &&
          !current.items.some((existing) => existing.id === item.id),
      );
      if (newlyInserted.length > 0 && newlyInserted.some((item) => isCountableHistoryItem(item))) {
        totalCount += 1;
      }
    }

    const reducedDetached: UiTimelineSnapshot = {
      ...reduced,
      items: this.detachLargePayloads(threadId, reduced.items),
    };

    const next = this.applyTimelineWindow(
      threadId,
      this.turn.withClientQueuedCount(threadId, { ...reducedDetached, totalCount }),
    );
    this.patchTimelineState(threadId, next);
    this.turn.consumePendingUserInputFromEvent(threadId, event);
    this.events.send({ type: "timeline_event", threadId, event });
    if (event.eventType === "stream_lagged") {
      this.pendingBackfillByThreadId[threadId] = true;
      return;
    }
    if (event.eventType === "stream_resync_required") {
      return;
    }
    if (this.shouldResyncForEvent(threadId, event)) {
      this.requestThreadResync(threadId, event.eventType);
    }
    if (event.eventType === "turn_finalized" || event.eventType === "thread_idle") {
      this.turn.maybeDrainQueuedInput(threadId, event.eventType);
    }
  }

  private shouldForceRunningFromEvent(event: UiTimelineEvent): boolean {
    if (event.eventType === "item_added" || event.eventType === "item_updated") {
      return true;
    }
    if (event.eventType !== "rpc_notification") {
      return false;
    }
    const payload =
      event.payload && typeof event.payload === "object" && !Array.isArray(event.payload)
        ? (event.payload as Record<string, unknown>)
        : null;
    const method = typeof payload?.method === "string" ? payload.method.trim() : "";
    if (!method) {
      return false;
    }
    return method.startsWith("item/");
  }

  private shouldResyncForEvent(threadId: string, event: UiTimelineEvent): boolean {
    if (event.eventType !== "turn_finalized") {
      return false;
    }
    if (!this.pendingBackfillByThreadId[threadId]) {
      return false;
    }
    const payload =
      event.payload && typeof event.payload === "object" && !Array.isArray(event.payload)
        ? (event.payload as Record<string, unknown>)
        : null;
    const turn =
      payload?.turn && typeof payload.turn === "object" && !Array.isArray(payload.turn)
        ? (payload.turn as Record<string, unknown>)
        : null;
    const turnId = event.turnId?.trim();
    if (!turnId) {
      this.pendingBackfillByThreadId[threadId] = false;
      return true;
    }
    const turnItems = Array.isArray(turn?.items) ? (turn.items as unknown[]) : null;
    const hasTurnItemsInTimeline = Boolean(
      this.state.timelineByThreadId[threadId]?.items.some((item) => item.turnId === turnId),
    );
    const shouldBackfill =
      !hasTurnItemsInTimeline && (!turnItems || turnItems.length === 0);
    this.pendingBackfillByThreadId[threadId] = false;
    return shouldBackfill;
  }

  private requestThreadResync(
    threadId: string,
    reason: string,
    options: { allowDegraded?: boolean } = {},
  ): void {
    if (this.resyncInFlightByThreadId[threadId]) {
      return;
    }
    const runId = this.resolveRunIdForThread(threadId);
    if (!runId) {
      this.patchState({ error: `Missing runId for thread resync: thread=${threadId}` });
      return;
    }
    this.resyncInFlightByThreadId[threadId] = true;
    this.pendingBackfillByThreadId[threadId] = false;
    this.setThreadSyncPhase(threadId, "resync_required", reason);
    let degradedMode = false;
    void this.liveSync.connectStreamAndRefreshRun(runId, {
      forceReconnect: true,
      gateDuringConnect: true,
      gateThreadId: threadId,
      readReason: `resync:${reason}`,
    })
      .then((opened) => {
        if (!opened) {
          throw new Error("notification stream not opened");
        }
      })
      .then(() => {
        this.setThreadSyncPhase(threadId, "live", `resync_completed:${reason}`);
      })
      .catch((error) => {
        if (options.allowDegraded) {
          degradedMode = true;
          const message = error instanceof Error ? error.message : "resync failed";
          this.setThreadSyncPhase(threadId, "live_degraded", `resync_failed:${reason}`);
          this.patchState({
            error: `Thread resync failed (${reason}): ${message}`,
          });
          return;
        }
        this.setThreadSyncPhase(threadId, "resync_required", `resync_failed:${reason}`);
      })
      .finally(() => {
        const selectedThreadId = this.state.selectedThreadId;
        if (this.resolveRunIdForThread(selectedThreadId) === runId) {
          this.liveSync.ensureRunEventStream(runId, {
            forceReconnect: true,
            gateDuringConnect: !degradedMode,
            gateThreadId: selectedThreadId,
          });
        }
        this.resyncInFlightByThreadId[threadId] = false;
      });
  }

  private async refreshRunState(
    runId: string,
    reason = "manual",
  ): Promise<void> {
    const normalizedRunId = runId.trim();
    if (!normalizedRunId) {
      return;
    }

    const requestSequence = (this.refreshSequenceByRunId[normalizedRunId] ?? 0) + 1;
    this.refreshSequenceByRunId[normalizedRunId] = requestSequence;
    this.refreshReasonByRunId[normalizedRunId] = reason;

    this.loadingSnapshotRequests += 1;
    this.patchFlags({ loadingSnapshot: true });

    const threadIdsInRun = this.state.threads
      .filter((thread) => thread.projectName === normalizedRunId)
      .map((thread) => thread.id);
    const countsByThreadId: Record<string, number> = {};
    await Promise.all(
      threadIdsInRun.map(async (threadId) => {
        const durableCount = await this.timeline.getCachedDurableCount(threadId);
        if (durableCount !== null) {
          countsByThreadId[threadId] = durableCount;
          return;
        }
        const current = this.state.timelineByThreadId[threadId];
        const fallback =
          typeof current?.totalCount === "number" && Number.isFinite(current.totalCount)
            ? Math.max(0, Math.trunc(current.totalCount))
            : countHistoryItems(current?.items ?? []);
        countsByThreadId[threadId] = fallback;
      }),
    );

    try {
      const baseline = await this.session.readRunBaseline(normalizedRunId, { countsByThreadId });
      if (requestSequence !== this.refreshSequenceByRunId[normalizedRunId]) {
        return;
      }

      for (const [threadId, snapshot] of Object.entries(baseline.snapshotsByThreadId)) {
        this.persistBaselineSnapshotToCache(threadId, snapshot);
        this.applyThreadSessionState(threadId, null, snapshot);
      }

      const selectedThreadId = this.state.selectedThreadId;
      const selectedError = baseline.errorsByThreadId[selectedThreadId];
      if (selectedError) {
        this.patchState({ error: `${selectedError} (refresh=${reason})` });
      } else if (Object.keys(baseline.errorsByThreadId).length > 0) {
        const first = Object.entries(baseline.errorsByThreadId)[0];
        this.patchState({
          error: `Partial run read failed: thread=${first?.[0] ?? "unknown"} error=${first?.[1] ?? "unknown"} (refresh=${reason})`,
        });
      }
    } catch (error) {
      if (requestSequence !== this.refreshSequenceByRunId[normalizedRunId]) {
        return;
      }
      this.patchState({
        error:
          error instanceof Error
            ? `${error.message} (refresh=${reason})`
            : `Failed to load run state (refresh=${reason})`,
      });
    } finally {
      if (this.refreshReasonByRunId[normalizedRunId] === reason) {
        delete this.refreshReasonByRunId[normalizedRunId];
      }
      this.loadingSnapshotRequests = Math.max(0, this.loadingSnapshotRequests - 1);
      this.patchFlags({ loadingSnapshot: this.loadingSnapshotRequests > 0 });
    }
  }

}

export function createAppRuntime(session?: AppServerSession): AppRuntime {
  return new AppRuntime(session);
}
