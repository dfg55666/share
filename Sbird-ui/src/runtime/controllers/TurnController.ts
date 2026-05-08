import type {
  ThreadSendMode,
  ThreadServerRequestReplyResponse,
  UiServerRequest,
  UiTimelineEvent,
  UiTimelineSnapshot,
} from "../../api/contracts";
import { fromSnapshot, normalizeTimelineItem, type TimelineMutableState } from "../../domain/timeline";
import type { ServerRequestReply } from "../../domain/server-request";
import type { AppServerSession } from "../AppServerSession";
import type { PendingInputEntry } from "../../domain/input";
import { normalizeBacktrackTurns } from "../internal/app_backtrack";
import type { AppEvent } from "../internal/app_event";

type PendingOptimisticUserMessage = { id: string; text: string };

type TurnControllerState = {
  timelineByThreadId: Record<string, TimelineMutableState>;
};

type TurnControllerContext = {
  session: AppServerSession;
  getState: () => TurnControllerState;
  emitEvent: (event: AppEvent) => void;
  patchState: (patch: { error?: string }) => void;
  patchFlags: (patch: { sending?: boolean; interrupting?: boolean }) => void;
  isSendBlockedBySync: (threadId: string) => boolean;
  resolveRunIdForThread: (threadId: string) => string;
  refreshRunState: (runId: string, reason: string) => Promise<void>;
  upsertTimeline: (threadId: string) => TimelineMutableState;
  patchTimelineState: (threadId: string, timeline: TimelineMutableState) => void;
  appendOptimisticUserMessage: (threadId: string, text: string) => string | null;
  removeTimelineItem: (threadId: string, itemId: string) => void;
};

export type TurnServerRequestReplyOutcome = {
  status: ThreadServerRequestReplyResponse["status"] | "error";
  refreshed: boolean;
  localReconciled: boolean;
  notice?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeReplyVersion(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.max(0, Math.trunc(value));
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

export class TurnController {
  private readonly queuedInputByThreadId: Record<string, string[]> = {};
  private readonly pendingSteersByThreadId: Record<string, string[]> = {};
  private readonly pendingOptimisticByThreadId: Record<string, PendingOptimisticUserMessage[]> =
    {};
  private readonly queueDrainInFlightByThreadId: Record<string, boolean> = {};

  constructor(private readonly context: TurnControllerContext) {}

  public dispose(): void {
    this.clearRecord(this.queuedInputByThreadId);
    this.clearRecord(this.pendingSteersByThreadId);
    this.clearRecord(this.pendingOptimisticByThreadId);
    this.clearRecord(this.queueDrainInFlightByThreadId);
  }

  public listPendingInputs(threadId: string): PendingInputEntry[] {
    const normalizedThreadId = threadId.trim();
    if (!normalizedThreadId) return [];

    const entries: PendingInputEntry[] = [];
    const pendingSteers = this.pendingSteersByThreadId[normalizedThreadId];
    if (pendingSteers && pendingSteers.length > 0) {
      for (const text of pendingSteers) {
        if (!text.trim()) continue;
        entries.push({ kind: "steer", text });
      }
    }

    const queued = this.queuedInputByThreadId[normalizedThreadId];
    if (queued && queued.length > 0) {
      for (const text of queued) {
        if (!text.trim()) continue;
        entries.push({ kind: "queued", text });
      }
    }

    return entries;
  }

  public withClientQueuedCount(
    threadId: string,
    snapshot: UiTimelineSnapshot,
  ): UiTimelineSnapshot {
    const queuedCount = this.clientQueuedCount(threadId);
    if (snapshot.runtime.queuedCount === queuedCount) {
      return snapshot;
    }
    return {
      ...snapshot,
      runtime: {
        ...snapshot.runtime,
        queuedCount,
      },
    };
  }

  public async sendMessage(
    threadId: string,
    content: string,
    mode: ThreadSendMode = "steer",
  ): Promise<void> {
    const normalized = content.trim();
    if (!normalized) return;
    if (this.context.isSendBlockedBySync(threadId)) {
      return;
    }
    const runtimeInProgress = Boolean(
      this.context.getState().timelineByThreadId[threadId]?.runtime.inProgress,
    );

    this.context.emitEvent({
      type: "send_message",
      threadId,
      content: normalized,
      mode,
    });

    // TUI parity: "Queued" stays client-side until there is no active turn.
    if (mode === "queue") {
      this.enqueueClientInput(threadId, normalized);
      this.maybeDrainQueuedInput(threadId, "queued");
      return;
    }

    if (runtimeInProgress) {
      await this.sendSteerInput(threadId, normalized);
      return;
    }

    await this.sendStartInput(threadId, normalized, "submitted");
  }

  public async interrupt(threadId: string): Promise<void> {
    this.context.patchFlags({ interrupting: true });
    try {
      this.context.emitEvent({ type: "interrupt", threadId });
      await this.context.session.turnInterrupt(threadId);
      // Upstream contract: `turn/interrupt` is followed by a `turn/completed` notification with
      // status "interrupted". Avoid an eager `/read` here because disk-backed history can lag
      // behind the live notification stream (causing UI rewind / historyReset).
    } catch (error) {
      this.context.patchState({
        error: error instanceof Error ? error.message : "Failed to interrupt thread",
      });
    } finally {
      this.context.patchFlags({ interrupting: false });
    }
  }

  public async rollback(threadId: string, numTurns: number): Promise<void> {
    const acceptedTurns = normalizeBacktrackTurns(numTurns);
    try {
      this.context.emitEvent({ type: "rollback", threadId, numTurns: acceptedTurns });
      await this.context.session.threadRollback(threadId, acceptedTurns);
      const runId = this.context.resolveRunIdForThread(threadId);
      if (runId) {
        await this.context.refreshRunState(runId, "rollback_read");
      }
    } catch (error) {
      this.context.patchState({
        error: error instanceof Error ? error.message : "Failed to rollback thread",
      });
    }
  }

  public async respondServerRequest(
    threadId: string,
    request: UiServerRequest,
    reply: ServerRequestReply,
  ): Promise<TurnServerRequestReplyOutcome> {
    const pendingVersion =
      this.context.getState().timelineByThreadId[threadId]?.pendingRequestSetVersion ?? 0;
    try {
      this.context.emitEvent({
        type: "respond_server_request",
        threadId,
        requestId: request.id,
        reply,
      });
      const response = await this.context.session.resolveServerRequest(
        threadId,
        request,
        reply,
        pendingVersion,
      );
      const strategy = this.reconcileServerRequestReply(threadId, request, response);
      let refreshed = false;
      if (strategy.refreshNeeded) {
        const runId = this.context.resolveRunIdForThread(threadId);
        if (runId) {
          await this.context.refreshRunState(runId, "server_request_read");
          refreshed = true;
        } else {
          this.context.patchState({
            error: `Missing runId for server-request sync: thread=${threadId}`,
          });
        }
      }
      return {
        status: response.status,
        refreshed,
        localReconciled: strategy.localReconciled,
        notice: strategy.notice,
      };
    } catch (error) {
      this.context.patchState({
        error:
          error instanceof Error ? error.message : "Failed to respond server request",
      });
      return {
        status: "error",
        refreshed: false,
        localReconciled: false,
        notice: "审批提交失败，请稍后重试。",
      };
    }
  }

  public reconcilePendingFromBaselineUserTexts(
    threadId: string,
    recentUserTexts: Set<string>,
  ): Set<string> {
    const optimisticItemIdsToDrop = new Set<string>();
    if (recentUserTexts.size === 0) {
      return optimisticItemIdsToDrop;
    }

    for (const text of recentUserTexts) {
      this.consumePendingSteerByText(threadId, text);
    }

    const pendingOptimistic = this.pendingOptimisticByThreadId[threadId];
    if (!pendingOptimistic || pendingOptimistic.length === 0) {
      return optimisticItemIdsToDrop;
    }
    const kept: PendingOptimisticUserMessage[] = [];
    for (const entry of pendingOptimistic) {
      if (recentUserTexts.has(entry.text.trim())) {
        optimisticItemIdsToDrop.add(entry.id);
      } else {
        kept.push(entry);
      }
    }
    if (kept.length > 0) {
      this.pendingOptimisticByThreadId[threadId] = kept;
    } else {
      delete this.pendingOptimisticByThreadId[threadId];
    }
    return optimisticItemIdsToDrop;
  }

  public consumePendingUserInputFromEvent(threadId: string, event: UiTimelineEvent): void {
    if (event.eventType !== "item_added" && event.eventType !== "item_finalized") {
      return;
    }
    const payload = asRecord(event.payload);
    const item = payload?.item;
    if (!item) {
      return;
    }
    const normalized = normalizeTimelineItem(item);
    if (normalized.itemType !== "user-message") {
      return;
    }
    const text = normalized.text.trim();
    if (!text) {
      return;
    }
    this.consumePendingSteerByText(threadId, text);
    this.consumePendingOptimisticByText(threadId, text);
  }

  public maybeDrainQueuedInput(threadId: string, reason: string): void {
    if (this.queueDrainInFlightByThreadId[threadId]) {
      return;
    }
    const queue = this.queuedInputByThreadId[threadId];
    if (!queue || queue.length === 0) {
      this.syncClientQueuedCount(threadId);
      return;
    }
    const runtime = this.context.getState().timelineByThreadId[threadId]?.runtime;
    if (runtime?.inProgress) {
      this.syncClientQueuedCount(threadId);
      return;
    }
    if (this.context.isSendBlockedBySync(threadId)) {
      this.syncClientQueuedCount(threadId);
      return;
    }

    const nextText = queue[0]?.trim();
    if (!nextText) {
      this.shiftClientQueuedInput(threadId);
      return;
    }
    this.queueDrainInFlightByThreadId[threadId] = true;
    void this.sendStartInput(threadId, nextText, `queue_drain:${reason}`, true).finally(() => {
      this.queueDrainInFlightByThreadId[threadId] = false;
    });
  }

  private reconcileServerRequestReply(
    threadId: string,
    request: UiServerRequest,
    response: ThreadServerRequestReplyResponse,
  ): {
    refreshNeeded: boolean;
    localReconciled: boolean;
    notice?: string;
  } {
    const status = (response.status ?? "").trim().toLowerCase();
    const currentRequestVersion = normalizeReplyVersion(response.currentRequestVersion);
    const currentPendingSetVersion = normalizeReplyVersion(
      response.currentPendingRequestSetVersion,
    );

    if (status === "stale") {
      const canConverge =
        typeof currentRequestVersion === "number" &&
        typeof currentPendingSetVersion === "number";
      if (!canConverge) {
        return {
          refreshNeeded: true,
          localReconciled: false,
          notice: "审批状态已变化，正在同步最新请求。",
        };
      }
      const converged = this.updatePendingRequestVersion(
        threadId,
        request.id,
        currentRequestVersion,
        currentPendingSetVersion,
      );
      return {
        refreshNeeded: !converged,
        localReconciled: converged,
        notice: converged
          ? "审批版本已更新，请确认后重试。"
          : "审批状态已变化，正在同步最新请求。",
      };
    }

    if (status === "already_resolved_conflict") {
      const reconciled = this.removePendingRequest(
        threadId,
        request.id,
        currentPendingSetVersion,
      );
      return {
        refreshNeeded: false,
        localReconciled: reconciled,
        notice: "该审批已被其他端处理，当前请求已关闭。",
      };
    }

    if (status === "already_resolved") {
      const reconciled = this.removePendingRequest(
        threadId,
        request.id,
        currentPendingSetVersion,
      );
      return {
        refreshNeeded: false,
        localReconciled: reconciled,
        notice: "该审批已完成，无需重复处理。",
      };
    }

    if (status === "not_found") {
      const reconciled = this.removePendingRequest(
        threadId,
        request.id,
        currentPendingSetVersion,
      );
      return {
        refreshNeeded: true,
        localReconciled: reconciled,
        notice: "审批请求已失效，正在同步最新状态。",
      };
    }

    if (status === "ok") {
      const reconciled = this.removePendingRequest(
        threadId,
        request.id,
        currentPendingSetVersion,
      );
      return {
        refreshNeeded: !reconciled,
        localReconciled: reconciled,
      };
    }

    return {
      refreshNeeded: true,
      localReconciled: false,
      notice: "审批响应状态未知，正在同步最新状态。",
    };
  }

  private updatePendingRequestVersion(
    threadId: string,
    requestId: number,
    requestVersion: number,
    pendingRequestSetVersion: number,
  ): boolean {
    const current = this.context.getState().timelineByThreadId[threadId];
    if (!current) {
      return false;
    }

    const index = current.pendingRequests.findIndex((entry) => entry.id === requestId);
    if (index === -1) {
      return this.removePendingRequest(threadId, requestId, pendingRequestSetVersion);
    }

    const original = current.pendingRequests[index];
    const updated: UiServerRequest = {
      ...original,
      requestVersion,
      pendingRequestSetVersion,
      requestSetVersion: pendingRequestSetVersion,
    };

    const pendingRequests = [...current.pendingRequests];
    pendingRequests[index] = updated;

    const nextPendingVersion = Math.max(
      current.pendingRequestSetVersion,
      pendingRequestSetVersion,
    );
    const nextRequestSetVersion = Math.max(current.requestSetVersion ?? 0, nextPendingVersion);

    const next = fromSnapshot({
      ...current,
      pendingRequests: sortPendingRequests(pendingRequests),
      pendingRequestSetVersion: nextPendingVersion,
      requestSetVersion: nextRequestSetVersion > 0 ? nextRequestSetVersion : undefined,
    });
    this.context.patchTimelineState(threadId, next);
    return true;
  }

  private removePendingRequest(
    threadId: string,
    requestId: number,
    pendingRequestSetVersion?: number,
  ): boolean {
    const current = this.context.getState().timelineByThreadId[threadId];
    if (!current) {
      return false;
    }

    const removed = current.pendingRequests.some((entry) => entry.id === requestId);
    const pendingRequests = removed
      ? current.pendingRequests.filter((entry) => entry.id !== requestId)
      : current.pendingRequests;

    const targetVersion =
      typeof pendingRequestSetVersion === "number"
        ? pendingRequestSetVersion
        : removed
          ? current.pendingRequestSetVersion + 1
          : current.pendingRequestSetVersion;
    const nextPendingVersion = Math.max(current.pendingRequestSetVersion, targetVersion);
    const nextRequestSetVersion = Math.max(current.requestSetVersion ?? 0, nextPendingVersion);

    const changed =
      removed ||
      nextPendingVersion !== current.pendingRequestSetVersion ||
      nextRequestSetVersion !== (current.requestSetVersion ?? 0);
    if (!changed) {
      return false;
    }

    const next = fromSnapshot({
      ...current,
      pendingRequests: sortPendingRequests(pendingRequests),
      pendingRequestSetVersion: nextPendingVersion,
      requestSetVersion: nextRequestSetVersion > 0 ? nextRequestSetVersion : undefined,
    });
    this.context.patchTimelineState(threadId, next);
    return true;
  }

  private clientQueuedCount(threadId: string): number {
    return this.queuedInputByThreadId[threadId]?.length ?? 0;
  }

  private syncClientQueuedCount(threadId: string): void {
    const current = this.context.getState().timelineByThreadId[threadId];
    if (!current) {
      return;
    }
    const queuedCount = this.clientQueuedCount(threadId);
    if (current.runtime.queuedCount === queuedCount) {
      return;
    }
    const next = fromSnapshot({
      ...current,
      runtime: {
        ...current.runtime,
        queuedCount,
      },
    });
    this.context.patchTimelineState(threadId, next);
  }

  private enqueueClientInput(threadId: string, text: string): void {
    const queue = this.queuedInputByThreadId[threadId] ?? [];
    queue.push(text);
    this.queuedInputByThreadId[threadId] = queue;
    this.syncClientQueuedCount(threadId);
  }

  private shiftClientQueuedInput(threadId: string): string | undefined {
    const queue = this.queuedInputByThreadId[threadId];
    if (!queue || queue.length === 0) {
      return undefined;
    }
    const value = queue.shift();
    if (queue.length === 0) {
      delete this.queuedInputByThreadId[threadId];
    }
    this.syncClientQueuedCount(threadId);
    return value;
  }

  private markThreadPendingStart(threadId: string): void {
    const current = this.context.upsertTimeline(threadId);
    if (current.runtime.inProgress) {
      return;
    }
    const next = fromSnapshot({
      ...current,
      runtime: {
        ...current.runtime,
        inProgress: true,
        interruptRequested: false,
        lastError: null,
      },
    });
    this.context.patchTimelineState(threadId, next);
  }

  private clearPendingStartFlag(threadId: string): void {
    const current = this.context.getState().timelineByThreadId[threadId];
    if (!current) {
      return;
    }
    if (current.runtime.activeTurnId) {
      return;
    }
    const next = fromSnapshot({
      ...current,
      runtime: {
        ...current.runtime,
        inProgress: false,
      },
    });
    this.context.patchTimelineState(threadId, next);
  }

  private pushPendingSteer(threadId: string, text: string): void {
    const pending = this.pendingSteersByThreadId[threadId] ?? [];
    pending.push(text);
    this.pendingSteersByThreadId[threadId] = pending;
  }

  private consumePendingSteerByText(threadId: string, text: string): void {
    const pending = this.pendingSteersByThreadId[threadId];
    if (!pending || pending.length === 0) {
      return;
    }
    const target = text.trim();
    const index = pending.findIndex((value) => value.trim() === target);
    if (index === -1) {
      return;
    }
    pending.splice(index, 1);
    if (pending.length === 0) {
      delete this.pendingSteersByThreadId[threadId];
    }
  }

  private pushPendingOptimistic(
    threadId: string,
    itemId: string,
    text: string,
  ): void {
    const pending = this.pendingOptimisticByThreadId[threadId] ?? [];
    pending.push({ id: itemId, text });
    this.pendingOptimisticByThreadId[threadId] = pending;
  }

  private removePendingOptimisticById(threadId: string, itemId: string): void {
    const pending = this.pendingOptimisticByThreadId[threadId];
    if (!pending || pending.length === 0) {
      return;
    }
    const index = pending.findIndex((entry) => entry.id === itemId);
    if (index === -1) {
      return;
    }
    pending.splice(index, 1);
    if (pending.length === 0) {
      delete this.pendingOptimisticByThreadId[threadId];
    }
  }

  private consumePendingOptimisticByText(threadId: string, text: string): void {
    const pending = this.pendingOptimisticByThreadId[threadId];
    if (!pending || pending.length === 0) {
      return;
    }
    const target = text.trim();
    const index = pending.findIndex((entry) => entry.text.trim() === target);
    if (index === -1) {
      return;
    }
    const [matched] = pending.splice(index, 1);
    if (pending.length === 0) {
      delete this.pendingOptimisticByThreadId[threadId];
    }
    this.context.removeTimelineItem(threadId, matched.id);
  }

  private async sendSteerInput(
    threadId: string,
    text: string,
  ): Promise<void> {
    this.context.patchFlags({ sending: true });
    this.pushPendingSteer(threadId, text);
    try {
      await this.context.session.turnSend(threadId, text);
    } catch (error) {
      this.consumePendingSteerByText(threadId, text);
      this.context.patchState({
        error: error instanceof Error ? error.message : "Failed to send message",
      });
    } finally {
      this.context.patchFlags({ sending: false });
    }
  }

  private async sendStartInput(
    threadId: string,
    text: string,
    reason: string,
    fromQueue = false,
  ): Promise<void> {
    this.context.patchFlags({ sending: true });
    this.markThreadPendingStart(threadId);
    const optimisticItemId = this.context.appendOptimisticUserMessage(threadId, text);
    if (optimisticItemId) {
      this.pushPendingOptimistic(threadId, optimisticItemId, text);
    }

    try {
      await this.context.session.turnSend(threadId, text);
      if (fromQueue) {
        this.shiftClientQueuedInput(threadId);
      }
    } catch (error) {
      if (optimisticItemId) {
        this.removePendingOptimisticById(threadId, optimisticItemId);
        this.context.removeTimelineItem(threadId, optimisticItemId);
      }
      this.clearPendingStartFlag(threadId);
      this.context.patchState({
        error:
          error instanceof Error
            ? `${error.message} (${reason})`
            : `Failed to send message (${reason})`,
      });
    } finally {
      this.context.patchFlags({ sending: false });
      this.syncClientQueuedCount(threadId);
    }
  }

  private clearRecord(record: Record<string, unknown>): void {
    for (const key of Object.keys(record)) {
      delete record[key];
    }
  }
}
