import type { UiTimelineEvent } from "../../api/contracts";
import type { AppServerSession } from "../AppServerSession";

const ROLE_EVENTS_RECONNECT_BASE_MS = 1000;
const ROLE_EVENTS_RECONNECT_MAX_MS = 10000;
const STREAM_OPEN_TIMEOUT_MS = 5000;

type LiveSyncPhase = "hydrating" | "live" | "resync_required" | "live_degraded";

export type ConnectStreamAndRefreshRunOptions = {
  forceReconnect?: boolean;
  gateDuringConnect?: boolean;
  gateThreadId?: string;
  readReason: string;
  beforeRead?: () => boolean;
};

export type EnsureRunEventStreamOptions = {
  forceReconnect?: boolean;
  gateDuringConnect?: boolean;
  gateThreadId?: string;
  onOpenOnce?: () => void;
  onErrorOnce?: (error: Error) => void;
};

type LiveSyncControllerContext = {
  session: AppServerSession;
  getSelectedThreadId: () => string;
  patchState: (patch: { error?: string }) => void;
  patchFlags: (patch: { streamConnected: boolean }) => void;
  upsertTimeline: (threadId: string) => void;
  applyThreadEvent: (threadId: string, event: UiTimelineEvent) => void;
  refreshRunState: (runId: string, reason: string) => Promise<void>;
  setThreadSyncPhase: (threadId: string, phase: LiveSyncPhase, reason?: string) => void;
  getThreadSyncPhase: (threadId: string) => LiveSyncPhase;
  resolveRunIdForThread: (threadId: string) => string;
  onStreamOpenedForThread: (threadId: string) => void;
  sendStreamDisconnected: (threadId: string, reason: string) => void;
};

export class LiveSyncController {
  private streamRunId = "";
  private streamCleanup: (() => void) | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempt = 0;

  constructor(private readonly context: LiveSyncControllerContext) {}

  isConnectedToRun(runId: string): boolean {
    const normalizedRunId = runId.trim();
    return Boolean(
      normalizedRunId &&
        this.streamCleanup &&
        this.streamRunId === normalizedRunId,
    );
  }

  getCurrentRunId(): string {
    return this.streamRunId;
  }

  dispose(): void {
    this.closeRunEventStream();
    this.clearReconnectTimer();
  }

  async connectStreamAndRefreshRun(
    runId: string,
    options: ConnectStreamAndRefreshRunOptions,
  ): Promise<boolean> {
    const opened = await this.connectRunEventStreamAndWait(runId, {
      forceReconnect: options.forceReconnect,
      gateDuringConnect: options.gateDuringConnect,
      gateThreadId: options.gateThreadId,
    });
    if (!opened) {
      return false;
    }
    if (options.beforeRead && !options.beforeRead()) {
      return true;
    }
    await this.context.refreshRunState(runId, options.readReason);
    return true;
  }

  async connectRunEventStreamAndWait(
    runId: string,
    options: EnsureRunEventStreamOptions = {},
  ): Promise<boolean> {
    return await new Promise<boolean>((resolve) => {
      let settled = false;
      let timeoutId: number | null = null;
      const settle = (value: boolean): void => {
        if (settled) {
          return;
        }
        settled = true;
        if (timeoutId !== null && typeof window !== "undefined") {
          window.clearTimeout(timeoutId);
          timeoutId = null;
        }
        resolve(value);
      };

      if (typeof window !== "undefined") {
        timeoutId = window.setTimeout(() => settle(false), STREAM_OPEN_TIMEOUT_MS);
      }

      this.ensureRunEventStream(runId, {
        ...options,
        onOpenOnce: () => settle(true),
        onErrorOnce: () => settle(false),
      });
    });
  }

  closeRunEventStream(options: { resetRun?: boolean } = {}): void {
    this.streamCleanup?.();
    this.streamCleanup = null;
    if (options.resetRun !== false) {
      this.streamRunId = "";
    }
    this.context.patchFlags({ streamConnected: false });
  }

  ensureRunEventStream(
    runId: string,
    options: EnsureRunEventStreamOptions = {},
  ): void {
    const normalizedRunId = runId.trim();
    if (!normalizedRunId) {
      this.closeRunEventStream();
      return;
    }
    if (!options.forceReconnect && this.isConnectedToRun(normalizedRunId)) {
      return;
    }

    const gateDuringConnect = options.gateDuringConnect !== false;
    const gateThreadId = (options.gateThreadId ?? this.context.getSelectedThreadId()).trim();

    this.closeRunEventStream({ resetRun: false });
    this.streamRunId = normalizedRunId;
    if (gateDuringConnect && gateThreadId) {
      this.context.upsertTimeline(gateThreadId);
      this.context.setThreadSyncPhase(gateThreadId, "hydrating", "stream_connecting");
    }

    let onOpenOnce = options.onOpenOnce;
    let onErrorOnce = options.onErrorOnce;
    this.streamCleanup = this.context.session.subscribeRunEvents(
      normalizedRunId,
      {
        onOpen: () => {
          if (this.streamRunId !== normalizedRunId) return;
          onOpenOnce?.();
          onOpenOnce = undefined;
          onErrorOnce = undefined;
          this.reconnectAttempt = 0;
          if (gateDuringConnect && gateThreadId) {
            this.context.onStreamOpenedForThread(gateThreadId);
          }
          this.context.patchFlags({ streamConnected: true });
        },
        onEvent: (threadId, event) => {
          if (this.streamRunId !== normalizedRunId) return;
          const normalizedThreadId = threadId.trim();
          if (!normalizedThreadId) {
            return;
          }
          this.context.applyThreadEvent(normalizedThreadId, event);
        },
        onError: (error) => {
          if (this.streamRunId !== normalizedRunId) return;
          onErrorOnce?.(error);
          onOpenOnce = undefined;
          onErrorOnce = undefined;
          const selectedThreadId = this.context.getSelectedThreadId() || gateThreadId;
          this.context.sendStreamDisconnected(selectedThreadId, error.message);
          this.context.patchState({ error: error.message });
          this.closeRunEventStream({ resetRun: false });
          this.scheduleReconnect(normalizedRunId);
        },
      },
    );
  }

  private scheduleReconnect(runId: string): void {
    if (typeof window === "undefined" || this.reconnectTimer !== null) {
      return;
    }
    const delay = Math.min(
      ROLE_EVENTS_RECONNECT_BASE_MS * 2 ** this.reconnectAttempt,
      ROLE_EVENTS_RECONNECT_MAX_MS,
    );
    this.reconnectAttempt += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      const selectedThreadId = this.context.getSelectedThreadId();
      const selectedRunId = this.context.resolveRunIdForThread(selectedThreadId);
      if (selectedRunId === runId) {
        void this.connectStreamAndRefreshRun(runId, {
          forceReconnect: true,
          gateDuringConnect: this.context.getThreadSyncPhase(selectedThreadId) !== "live_degraded",
          gateThreadId: selectedThreadId,
          readReason: "reconnect_read",
        }).then((opened) => {
          if (opened) {
            return;
          }
          this.context.patchState({
            error: "Run notification stream did not open before read (refresh=reconnect_read)",
          });
        }).catch((error) => {
          this.context.patchState({
            error:
              error instanceof Error
                ? `${error.message} (refresh=reconnect_read)`
                : "Failed to load run state (refresh=reconnect_read)",
          });
        });
      }
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null && typeof window !== "undefined") {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
