import type { TimelineMutableState } from "../../domain/timeline";
import type { ThreadSummary } from "../../api/contracts";
import { sortThreadsByPriority, type AppServerSession } from "../AppServerSession";
import { selectInitialThreadId } from "../internal/agent_navigation";
import { listThreadsFromRuns } from "../internal/app_server_adapter";
import type { AppEvent } from "../internal/app_event";

type ThreadSyncPhase = "hydrating" | "live" | "resync_required" | "live_degraded";

type ConnectStreamAndRefreshRunOptions = {
  forceReconnect?: boolean;
  gateDuringConnect?: boolean;
  gateThreadId?: string;
  readReason: string;
  beforeRead?: () => boolean;
};

type ThreadCatalogControllerState = {
  threads: ThreadSummary[];
  selectedThreadId: string;
  timelineByThreadId: Record<string, TimelineMutableState>;
};

type ThreadCatalogControllerStatePatch = Partial<{
  threads: ThreadSummary[];
  selectedThreadId: string;
  projectDisplayNameById: Record<string, string>;
  error: string;
}>;

type ThreadCatalogControllerFlagsPatch = Partial<{
  loadingThreads: boolean;
}>;

type ThreadCatalogControllerContext = {
  session: AppServerSession;
  getState: () => ThreadCatalogControllerState;
  patchState: (patch: ThreadCatalogControllerStatePatch) => void;
  patchFlags: (patch: ThreadCatalogControllerFlagsPatch) => void;
  emitEvent: (event: AppEvent) => void;
  hydrateThreadTimelineFromCache: (
    threadId: string,
    shouldApply?: () => boolean,
  ) => Promise<void>;
  isConnectedToRun: (runId: string) => boolean;
  connectStreamAndRefreshRun: (
    runId: string,
    options: ConnectStreamAndRefreshRunOptions,
  ) => Promise<boolean>;
  getThreadSyncPhase: (threadId: string) => ThreadSyncPhase;
};

export class ThreadCatalogController {
  private selectThreadSequence = 0;

  constructor(private readonly context: ThreadCatalogControllerContext) {}

  public dispose(): void {}

  public async bootstrap(): Promise<void> {
    this.context.emitEvent({ type: "bootstrap" });
    await this.reloadThreadCatalog();
    const state = this.context.getState();
    const selected = state.selectedThreadId || selectInitialThreadId(state.threads);
    if (selected) {
      await this.selectThread(selected);
    }
  }

  public async reloadThreadCatalog(): Promise<void> {
    this.context.patchFlags({ loadingThreads: true });
    try {
      const payload = await listThreadsFromRuns(this.context.session);
      const currentState = this.context.getState();
      const threads = sortThreadsByPriority(
        payload.threads.map((thread) => {
          const liveInProgress =
            currentState.timelineByThreadId[thread.id]?.runtime.inProgress;
          if (typeof liveInProgress !== "boolean" || liveInProgress === thread.inProgress) {
            return thread;
          }
          return {
            ...thread,
            inProgress: liveInProgress,
          };
        }),
      );
      const selectedThreadId = this.resolveSelectedThreadId(threads);
      this.context.patchState({
        threads,
        projectDisplayNameById: payload.projectDisplayNameById,
        selectedThreadId,
        error: "",
      });
    } catch (error) {
      this.context.patchState({
        error: error instanceof Error ? error.message : "Failed to load thread catalog",
      });
    } finally {
      this.context.patchFlags({ loadingThreads: false });
    }
  }

  public async selectThread(threadId: string): Promise<void> {
    const normalizedThreadId = threadId.trim();
    if (!normalizedThreadId) return;
    const selectSequence = (this.selectThreadSequence += 1);
    this.context.patchState({ selectedThreadId: normalizedThreadId, error: "" });

    const runId = this.resolveRunIdForThread(normalizedThreadId);
    if (!runId) {
      this.context.patchState({ error: `Missing runId for thread=${normalizedThreadId}` });
      return;
    }
    const needsFullSync = !this.context.isConnectedToRun(runId);

    let streamConnected = false;
    try {
      await this.context.hydrateThreadTimelineFromCache(
        normalizedThreadId,
        () => selectSequence === this.selectThreadSequence,
      );
      if (selectSequence !== this.selectThreadSequence) {
        return;
      }

      streamConnected = true;
      if (needsFullSync) {
        streamConnected = await this.context.connectStreamAndRefreshRun(runId, {
          forceReconnect: true,
          gateDuringConnect:
            this.context.getThreadSyncPhase(normalizedThreadId) !== "live_degraded",
          gateThreadId: normalizedThreadId,
          readReason: "select_read",
          beforeRead: () => selectSequence === this.selectThreadSequence,
        });
      }
    } catch (error) {
      this.context.patchState({
        error:
          error instanceof Error
            ? error.message
            : "Failed to connect thread notification stream",
      });
      return;
    }
    if (selectSequence !== this.selectThreadSequence) {
      return;
    }
    if (!streamConnected) {
      this.context.patchState({
        error: "Run notification stream did not open before read",
      });
      return;
    }
    if (selectSequence !== this.selectThreadSequence) {
      return;
    }
    this.context.emitEvent({ type: "select_thread", threadId: normalizedThreadId });
  }

  public async renameThread(threadId: string, name: string): Promise<void> {
    try {
      this.context.emitEvent({ type: "rename_thread", threadId, name });
      await this.context.session.threadSetName(threadId, name);
      await this.reloadThreadCatalog();
    } catch (error) {
      this.context.patchState({
        error: error instanceof Error ? error.message : "Failed to rename thread",
      });
    }
  }

  public async archiveThread(threadId: string): Promise<void> {
    try {
      this.context.emitEvent({ type: "archive_thread", threadId });
      await this.context.session.threadArchive(threadId);
      await this.reloadThreadCatalog();
    } catch (error) {
      this.context.patchState({
        error: error instanceof Error ? error.message : "Failed to archive thread",
      });
    }
  }

  public async forkThread(threadId: string): Promise<string | undefined> {
    try {
      this.context.emitEvent({ type: "fork_thread", threadId });
      const response = await this.context.session.threadFork(threadId);
      await this.reloadThreadCatalog();
      const nextThreadId = response.threadId?.trim();
      if (nextThreadId) {
        await this.selectThread(nextThreadId);
        return nextThreadId;
      }
    } catch (error) {
      this.context.patchState({
        error: error instanceof Error ? error.message : "Failed to fork thread",
      });
    }
    return undefined;
  }

  public resolveRunIdForThread(threadId: string): string {
    const normalizedThreadId = threadId.trim();
    if (!normalizedThreadId) {
      return "";
    }
    const entry = this.context
      .getState()
      .threads.find((thread) => thread.id === normalizedThreadId);
    return entry?.projectName?.trim() ?? "";
  }

  public syncThreadListInProgress(
    threadId: string,
    inProgress: boolean,
  ): ThreadSummary[] | null {
    const state = this.context.getState();
    const index = state.threads.findIndex((thread) => thread.id === threadId);
    if (index < 0) {
      return null;
    }
    const current = state.threads[index];
    if (current.inProgress === inProgress) {
      return null;
    }
    const nextThreads = [...state.threads];
    nextThreads[index] = {
      ...current,
      inProgress,
    };
    return sortThreadsByPriority(nextThreads);
  }

  public resolveSelectedThreadId(threads: ThreadSummary[]): string {
    const current = this.context.getState().selectedThreadId;
    if (current && threads.some((thread) => thread.id === current)) {
      return current;
    }
    return selectInitialThreadId(threads);
  }
}
