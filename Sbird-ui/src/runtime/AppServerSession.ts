import {
  ApiClient,
  buildRunReadPath,
  buildThreadSendPath,
  buildThreadTurnContextOverridePath,
  openRunTimelineEventStream,
} from "../api";
import {
  type EngineRunSnapshot,
  type EngineRunsResponse,
  type InterruptRoleResponse,
  type SendRoleMessageResponse,
  type ThreadArchiveResponse,
  type ThreadForkResponse,
  type ThreadRollbackResponse,
  type ThreadSendMode,
  type ThreadServerRequestReplyResponse,
  type ThreadSummary,
  type ThreadRenameResponse,
  type UiServerRequest,
  type UiTimelineEvent,
  type UiTimelineSnapshot,
} from "../api/contracts";
import { buildServerRequestReply, type ServerRequestReply } from "../domain/server-request";
import { normalizeTimelineSnapshot } from "../domain/timeline";

export type ThreadSessionState = {
  threadId: string;
  runId?: string;
  workflowKey?: string;
  agentId?: string;
  status?: string;
  currentStep?: string;
  inProgress?: boolean;
  activeTurnId?: string | null;
};

function isTimelineSnapshotPayload(value: unknown): value is {
  items: unknown[];
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return Array.isArray(record.items);
}

function normalizeReadBaseline(
  raw: unknown,
  fallbackThreadId: string,
): UiTimelineSnapshot | undefined {
  if (!isTimelineSnapshotPayload(raw)) {
    return undefined;
  }
  return normalizeTimelineSnapshot(raw, fallbackThreadId);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function sortThreadsByPriority(threads: ThreadSummary[]): ThreadSummary[] {
  return threads
    .map((thread, index) => ({ thread, index }))
    .sort((left, right) => {
      if (left.thread.inProgress !== right.thread.inProgress) {
        return left.thread.inProgress ? -1 : 1;
      }
      const leftUpdated = Date.parse(left.thread.updatedAtIso);
      const rightUpdated = Date.parse(right.thread.updatedAtIso);
      if (
        Number.isFinite(leftUpdated) &&
        Number.isFinite(rightUpdated) &&
        leftUpdated !== rightUpdated
      ) {
        return rightUpdated - leftUpdated;
      }
      return left.index - right.index;
    })
    .map(({ thread }) => thread);
}

export class AppServerSession {
  private readonly client: ApiClient;

  constructor(client = new ApiClient("/api")) {
    this.client = client;
  }

  async listRuns(): Promise<EngineRunSnapshot[]> {
    const response = await this.client.get<EngineRunsResponse | EngineRunSnapshot[]>("/runs");
    if (Array.isArray(response)) {
      return response;
    }
    if (response && typeof response === "object" && Array.isArray(response.runs)) {
      return response.runs;
    }
    return [];
  }

  async readRunBaseline(
    runId: string,
    options?: {
      count?: number;
      countsByThreadId?: Record<string, number>;
    },
  ): Promise<{
    runId: string;
    snapshotsByThreadId: Record<string, UiTimelineSnapshot>;
    errorsByThreadId: Record<string, string>;
  }> {
    const path = buildRunReadPath(runId, options);
    const raw = await this.client.get<unknown>(path);
    const record = asRecord(raw) ?? {};
    const threads = asRecord(record.threads) ?? {};
    const errors = asRecord(record.errors) ?? {};

    const snapshotsByThreadId: Record<string, UiTimelineSnapshot> = {};
    const errorsByThreadId: Record<string, string> = {};

    for (const [threadId, snapshotRaw] of Object.entries(threads)) {
      const normalizedThreadId = threadId.trim();
      if (!normalizedThreadId) {
        continue;
      }
      const snapshot = normalizeReadBaseline(snapshotRaw, normalizedThreadId);
      if (snapshot) {
        snapshotsByThreadId[normalizedThreadId] = snapshot;
      }
    }

    for (const [threadId, error] of Object.entries(errors)) {
      const normalizedThreadId = threadId.trim();
      if (!normalizedThreadId) {
        continue;
      }
      if (typeof error === "string" && error.trim()) {
        errorsByThreadId[normalizedThreadId] = error.trim();
      }
    }

    return { runId, snapshotsByThreadId, errorsByThreadId };
  }

  async turnSend(
    threadId: string,
    content: string,
  ): Promise<SendRoleMessageResponse> {
    const path = buildThreadSendPath(threadId);
    const payload: Record<string, unknown> = {
      input: [{ type: "text", text: content, textElements: [] }],
    };
    const raw = await this.client.post<unknown>(path, payload);
    return this.toSendRoleMessageResponse(raw, "steer");
  }

  async turnContextOverride(
    threadId: string,
    overrides: { model?: string | null; effort?: string | null },
  ): Promise<{ status: string }> {
    const path = buildThreadTurnContextOverridePath(threadId);
    const payload: Record<string, unknown> = {};
    if ("model" in overrides) {
      payload.model = overrides.model;
    }
    if ("effort" in overrides) {
      payload.effort = overrides.effort;
    }
    return this.client.post<{ status: string }>(path, payload);
  }

  async turnInterrupt(threadId: string, turnId?: string): Promise<InterruptRoleResponse> {
    const normalizedTurnId = typeof turnId === "string" ? turnId.trim() : "";
    const payload: { turnId?: string } = {};
    if (normalizedTurnId) {
      payload.turnId = normalizedTurnId;
    }
    return this.client.post<InterruptRoleResponse>(
      `/threads/${encodeURIComponent(threadId)}/interrupt`,
      payload,
    );
  }

  async threadRollback(threadId: string, numTurns = 1): Promise<ThreadRollbackResponse> {
    return this.client.post<ThreadRollbackResponse>(
      `/threads/${encodeURIComponent(threadId)}/rollback`,
      { numTurns },
    );
  }

  async threadRename(threadId: string, name: string): Promise<ThreadRenameResponse> {
    return this.client.post<ThreadRenameResponse>(
      `/threads/${encodeURIComponent(threadId)}/rename`,
      { name },
    );
  }

  async threadSetName(threadId: string, name: string): Promise<ThreadRenameResponse> {
    return this.threadRename(threadId, name);
  }

  async threadArchive(threadId: string): Promise<ThreadArchiveResponse> {
    return this.client.post<ThreadArchiveResponse>(
      `/threads/${encodeURIComponent(threadId)}/archive`,
      {},
    );
  }

  async threadFork(threadId: string): Promise<ThreadForkResponse> {
    return this.client.post<ThreadForkResponse>(`/threads/${encodeURIComponent(threadId)}/fork`, {});
  }

  async resolveServerRequest(
    threadId: string,
    request: UiServerRequest,
    reply: ServerRequestReply,
    pendingRequestSetVersion: number,
  ): Promise<ThreadServerRequestReplyResponse> {
    return this.client.post<ThreadServerRequestReplyResponse>(
      `/threads/${encodeURIComponent(threadId)}/server-requests/respond`,
      buildServerRequestReply(
        {
          ...reply,
          id: reply.id ?? request.id,
          requestVersion: reply.requestVersion ?? request.requestVersion,
        },
        pendingRequestSetVersion,
      ),
    );
  }

  subscribeRunEvents(
    runId: string,
    callbacks: {
      onOpen?: () => void;
      onEvent: (threadId: string, event: UiTimelineEvent) => void;
      onError?: (error: Error) => void;
    },
  ): () => void {
    const stream = openRunTimelineEventStream(
      runId,
      {},
      callbacks,
    );
    return () => stream.close();
  }

  private toSendRoleMessageResponse(raw: unknown, mode: ThreadSendMode): SendRoleMessageResponse {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return {
        status: "ok",
      };
    }

    const record = raw as Record<string, unknown>;
    const status = typeof record.status === "string" && record.status.trim() ? record.status : "ok";
    const acceptedAs =
      typeof record.acceptedAs === "string" && record.acceptedAs.trim()
        ? record.acceptedAs
        : undefined;
    const messageId =
      typeof record.messageId === "string"
        ? record.messageId
        : typeof record.turnId === "string"
          ? record.turnId
          : null;

    return {
      status,
      acceptedAs,
      messageId,
      rejectionReason:
        typeof record.rejectionReason === "string" ? record.rejectionReason : undefined,
    };
  }
}
