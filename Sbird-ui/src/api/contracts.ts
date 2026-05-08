export type ThreadSendMode = "steer" | "queue";

export type UiTimelineItemType =
  | "user-message"
  | "assistant-message"
  | "reasoning"
  | "exec"
  | "mcp-tool-call"
  | "tool-call"
  | "worked"
  | "unknown";

export type CommandExecutionData = {
  command: string;
  cwd: string | null;
  status: "inProgress" | "completed" | "failed" | "declined" | "interrupted";
  aggregatedOutput: string;
  outputTruncated?: boolean;
  exitCode: number | null;
};

export type UiTimelineMcpToolCall = {
  server: string;
  tool: string;
  arguments: unknown;
  result: unknown;
  durationMs: number | null;
};

export type UiTimelineToolCall = {
  kind: string;
  label: string;
  status: string;
  details?: unknown;
  detailsTruncated?: boolean;
  durationMs?: number | null;
};

export type UiTimelineItem = {
  id: string;
  itemType: UiTimelineItemType;
  role: "user" | "assistant" | "system";
  text: string;
  status?: string;
  turnId?: string;
  turnIndex?: number;
  displaySeq?: number;
  createdAtIso?: string;
  completed: boolean;
  images?: string[];
  fileAttachments?: Array<{ label: string; path: string }>;
  commandExecution?: CommandExecutionData;
  mcpToolCall?: UiTimelineMcpToolCall;
  toolCall?: UiTimelineToolCall;
  rawPayload?: string;
  rawPayloadTruncated?: boolean;
};

export type UiThreadRuntime = {
  inProgress: boolean;
  queuedCount: number;
  activeTurnId?: string | null;
  interruptRequested: boolean;
  lastError?: string | null;
};

export type UiServerRequest = {
  id: number;
  method: string;
  threadId: string;
  turnId: string;
  itemId: string;
  receivedAtIso: string;
  requestVersion?: number;
  pendingRequestSetVersion?: number;
  requestSetVersion?: number;
  displaySeq?: number;
  params: unknown;
};

export type UiTimelineSnapshot = {
  threadId: string;
  runtime: UiThreadRuntime;
  pendingRequests: UiServerRequest[];
  pendingRequestSetVersion: number;
  requestSetVersion?: number;
  items: UiTimelineItem[];
  requestedCount?: number;
  totalCount?: number;
  historyReset?: boolean;
};

export type UiTimelineEvent = {
  eventType: string;
  turnId?: string;
  itemId?: string;
  requestId?: number;
  occurredAtIso: string;
  payload?: unknown;
};

export type EngineThreadDetail = {
  runId: string;
  workflowKey: string;
  runRoot: string;
  agentId: string;
  threadId: string;
  threadName: string;
  status: string;
  currentStep: string;
  currentAgent: string;
  lastError?: string | null;
  activeInProcess: boolean;
  threadStatus: ThreadStatusSnapshot;
};

export type ThreadSummary = {
  id: string;
  title: string;
  projectName: string;
  cwd: string;
  hasWorktree: boolean;
  createdAtIso: string;
  updatedAtIso: string;
  preview: string;
  unread: boolean;
  inProgress: boolean;
};

export type SendRoleMessageResponse = {
  status: string;
  acceptedAs?: string;
  messageId?: string | null;
  rejectionReason?: string | null;
};

export type InterruptRoleResponse = {
  status: string;
  outcome?: string;
};

export type ThreadRollbackResponse = {
  status: string;
};

export type ThreadRenameResponse = {
  status: string;
  name?: string;
};

export type ThreadArchiveResponse = {
  status: string;
};

export type ThreadForkResponse = {
  status: string;
  threadId?: string | null;
};

export type ThreadServerRequestReply = {
  id: number;
  requestVersion?: number;
  expectedPendingRequestSetVersion?: number;
  result?: unknown;
  error?: {
    code?: number;
    message: string;
  };
};

export type ThreadServerRequestReplyResponse = {
  status: "ok" | "stale" | "not_found" | "already_resolved" | "already_resolved_conflict" | string;
  currentRequestVersion?: number;
  currentPendingRequestSetVersion?: number;
};

export type EngineRunSnapshot = {
  runId: string;
  workflowKey: string;
  runRoot: string;
  status: string;
  currentStep: string;
  currentAgent: string;
  lastError?: string | null;
  activeInProcess: boolean;
  agentSessions: {
    entryAgent: string;
    agents: Record<
      string,
      { sessionId: string; threadId: string; threadName: string; running?: boolean }
    >;
  };
  agentActivity?: Record<string, { status: ThreadStatusSnapshot }>;
};

export type ThreadStatusSnapshot = {
  type: string;
  activeFlags?: string[];
};

export type EngineRunsResponse = {
  runs: EngineRunSnapshot[];
};
