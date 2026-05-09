import { normalizeServerRequest } from "../server-request";
import type {
  UiServerRequest,
  UiTimelineEvent,
  UiTimelineItem,
  UiTimelineSnapshot,
  UiThreadRuntime,
} from "../../api/contracts";
import { sortTimelineItems } from "./sort";

export type { UiTimelineEvent, UiTimelineItem, UiTimelineSnapshot } from "../../api/contracts";
export { sortTimelineItems } from "./sort";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function inferCompleted(record: Record<string, unknown>): boolean {
  const completedValue = record.completed;
  if (typeof completedValue === "boolean") {
    return completedValue;
  }

  const status = asString(record.status, "").trim().toLowerCase();
  if (status) {
    if (
      status === "inprogress" ||
      status === "in_progress" ||
      status === "pending" ||
      status === "running"
    ) {
      return false;
    }
  }

  // Mirror engine-side semantics: missing `completed` means durable unless explicitly in-progress.
  return true;
}

function normalizeRuntime(input: unknown): UiThreadRuntime {
  const record = asRecord(input);
  if (!record) {
    return {
      inProgress: false,
      queuedCount: 0,
      interruptRequested: false,
      activeTurnId: null,
      lastError: null,
    };
  }

  return {
    inProgress: asBoolean(record.inProgress, false),
    queuedCount: 0,
    activeTurnId: asString(record.activeTurnId, "") || null,
    interruptRequested: asBoolean(record.interruptRequested, false),
    lastError: asString(record.lastError, "") || null,
  };
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string");
}

function safeStringify(value: unknown): string | undefined {
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}

const devWarnedMissingTimelineItemId = new Set<string>();

function hasTimelineItemId(id: string): boolean {
  return id.trim().length > 0;
}

function warnMissingTimelineItemId(source: string, input: unknown): void {
  if (!import.meta.env.DEV) {
    return;
  }
  const record = asRecord(input);
  const key = `${source}:${asString(record?.type, asString(record?.itemType, "unknown"))}`;
  if (devWarnedMissingTimelineItemId.has(key)) {
    return;
  }
  devWarnedMissingTimelineItemId.add(key);
  console.warn(
    `[timeline] dropped item without id at ${source}`,
    record ?? input,
  );
}

function normalizeTurnErrorMessage(turn: Record<string, unknown> | null): string {
  if (!turn) {
    return "";
  }
  const error = asRecord(turn.error);
  return asString(error?.message, "").trim();
}

function buildTurnErrorItem(params: {
  id: string;
  message: string;
  occurredAtIso: string;
  displaySeq?: number;
  turnId?: string;
  rawPayload?: unknown;
}): UiTimelineItem | null {
  const message = params.message.trim();
  if (!message) {
    return null;
  }
  return {
    id: params.id,
    itemType: "worked",
    role: "system",
    text: message,
    status: "failed",
    turnId: params.turnId,
    displaySeq: params.displaySeq,
    createdAtIso: params.occurredAtIso,
    completed: true,
    rawPayload: safeStringify(params.rawPayload),
  };
}

function normalizeCommandExecutionStatus(
  value: unknown,
): "inProgress" | "completed" | "failed" | "declined" | "interrupted" {
  const raw = asString(value, "inProgress");
  if (
    raw === "inProgress" ||
    raw === "completed" ||
    raw === "failed" ||
    raw === "declined" ||
    raw === "interrupted"
  ) {
    return raw;
  }
  return "inProgress";
}

function normalizeToolStatus(value: unknown, fallback = "completed"): { status: string; completed: boolean } {
  const raw = asString(value, fallback).trim();
  if (!raw) {
    return { status: fallback, completed: fallback.toLowerCase() !== "inprogress" };
  }
  const lower = raw.toLowerCase();
  const inProgress =
    lower === "inprogress" ||
    lower === "in_progress" ||
    lower === "pending" ||
    lower === "running";
  return {
    status: inProgress ? "inProgress" : raw,
    completed: !inProgress,
  };
}

function normalizeToolItem(
  record: Record<string, unknown>,
  context: {
    id: string;
    turnId?: string;
    turnIndex?: number;
    displaySeq?: number;
    createdAtIso?: string;
    label: string;
    kind: string;
    status?: unknown;
    durationMs?: number | null;
    text?: string;
    details?: unknown;
  },
): UiTimelineItem {
  const normalized = normalizeToolStatus(context.status, "completed");
  return {
    id: context.id,
    itemType: "tool-call",
    role: "system",
    text: context.text ?? context.label,
    status: normalized.status,
    turnId: context.turnId,
    turnIndex: context.turnIndex,
    displaySeq: context.displaySeq,
    createdAtIso: context.createdAtIso,
    completed: normalized.completed,
    toolCall: {
      kind: context.kind,
      label: context.label,
      status: normalized.status,
      details: context.details ?? record,
      durationMs: context.durationMs ?? null,
    },
    rawPayload: safeStringify(record),
  };
}

function describeWebSearchAction(value: unknown): string {
  const action = asRecord(value);
  if (!action) {
    return "search";
  }
  const type = asString(action.type, "other");
  if (type === "search") {
    const query = asString(action.query).trim();
    const queries = asStringArray(action.queries).join(", ").trim();
    return query || queries || "search";
  }
  if (type === "openPage") {
    const url = asString(action.url).trim();
    return url ? `open ${url}` : "open page";
  }
  if (type === "findInPage") {
    const pattern = asString(action.pattern).trim();
    const url = asString(action.url).trim();
    if (pattern && url) {
      return `find \"${pattern}\" in ${url}`;
    }
    if (pattern) {
      return `find \"${pattern}\"`;
    }
    if (url) {
      return `find in ${url}`;
    }
    return "find in page";
  }
  return type || "other";
}

function normalizeThreadItemAsTimeline(record: Record<string, unknown>): UiTimelineItem | null {
  const sourceType = asString(record.type);
  if (!sourceType) {
    return null;
  }

  const id = asString(record.id);
  if (!hasTimelineItemId(id)) {
    warnMissingTimelineItemId("normalizeThreadItemAsTimeline", record);
    return null;
  }
  const turnId = asString(record.turnId, "") || undefined;
  const turnIndex = typeof record.turnIndex === "number" ? record.turnIndex : undefined;
  const displaySeq = typeof record.displaySeq === "number" ? record.displaySeq : undefined;
  const createdAtIso = asString(record.createdAtIso, "") || undefined;

  if (sourceType === "userMessage") {
    const parts: string[] = [];
    const images: string[] = [];
    const content = Array.isArray(record.content) ? record.content : [];
    for (const entry of content) {
      const item = asRecord(entry);
      if (!item) {
        continue;
      }
      const itemType = asString(item.type);
      if (itemType === "text") {
        const text = asString(item.text).trim();
        if (text) {
          parts.push(text);
        }
        continue;
      }
      if (itemType === "image") {
        const url = asString(item.url).trim();
        if (url) {
          images.push(url);
          parts.push(`[image] ${url}`);
        }
        continue;
      }
      if (itemType === "localImage") {
        const path = asString(item.path).trim();
        if (path) {
          images.push(path);
          parts.push(`[local_image] ${path}`);
        }
        continue;
      }
      if (itemType === "skill") {
        const name = asString(item.name).trim();
        const path = asString(item.path).trim();
        parts.push(`[skill] ${name || path || "unknown"}`);
        continue;
      }
      if (itemType === "mention") {
        const name = asString(item.name).trim();
        const path = asString(item.path).trim();
        parts.push(`[mention] ${name || path || "unknown"}`);
      }
    }

    return {
      id,
      itemType: "user-message",
      role: "user",
      text: parts.join("\n"),
      turnId,
      turnIndex,
      displaySeq,
      createdAtIso,
      completed: true,
      images: images.length > 0 ? images : undefined,
    };
  }

  if (sourceType === "agentMessage") {
    return {
      id,
      itemType: "assistant-message",
      role: "assistant",
      text: asString(record.text),
      status: asString(record.phase, "") || undefined,
      turnId,
      turnIndex,
      displaySeq,
      createdAtIso,
      completed: true,
    };
  }

  if (sourceType === "reasoning") {
    const summary = asStringArray(record.summary).join("\n");
    const content = asStringArray(record.content).join("\n");
    const text = [summary, content].filter((entry) => entry.trim().length > 0).join("\n\n");
    return {
      id,
      itemType: "reasoning",
      role: "assistant",
      text,
      turnId,
      turnIndex,
      displaySeq,
      createdAtIso,
      completed: true,
    };
  }

  if (sourceType === "commandExecution") {
    const status = normalizeCommandExecutionStatus(record.status);
    const command = asString(record.command);
    const output = asString(record.aggregatedOutput);
    return {
      id,
      itemType: "exec",
      role: "system",
      text: output || command,
      status,
      turnId,
      turnIndex,
      displaySeq,
      createdAtIso,
      completed: status !== "inProgress",
      commandExecution: {
        command,
        cwd: asString(record.cwd, "") || null,
        status,
        aggregatedOutput: output,
        exitCode: typeof record.exitCode === "number" ? record.exitCode : null,
      },
    };
  }

  if (sourceType === "mcpToolCall") {
    const status = asString(record.status, "inProgress");
    const server = asString(record.server);
    const tool = asString(record.tool);
    return {
      id,
      itemType: "mcp-tool-call",
      role: "system",
      text: `${server}/${tool}`,
      status,
      turnId,
      turnIndex,
      displaySeq,
      createdAtIso,
      completed: status !== "inProgress",
      mcpToolCall: {
        server,
        tool,
        arguments: record.arguments,
        result: record.result,
        durationMs: typeof record.durationMs === "number" ? record.durationMs : null,
      },
    };
  }

  if (sourceType === "fileChange") {
    const changes = Array.isArray(record.changes) ? record.changes : [];
    const status = asString(record.status, "inProgress");
    const changeSummary = changes
      .map((entry) => {
        const change = asRecord(entry);
        if (!change) {
          return "";
        }
        const path = asString(change.path).trim();
        const kind = asString(change.kind, "update");
        return path ? `${kind}:${path}` : kind;
      })
      .filter((entry) => entry.length > 0)
      .join(", ");
    const label = `file.change (${changes.length})`;
    return normalizeToolItem(record, {
      id,
      turnId,
      turnIndex,
      displaySeq,
      createdAtIso,
      label,
      kind: "fileChange",
      status,
      text: changeSummary || label,
      details: {
        status,
        changes,
      },
    });
  }

  if (sourceType === "dynamicToolCall") {
    const tool = asString(record.tool);
    return normalizeToolItem(record, {
      id,
      turnId,
      turnIndex,
      displaySeq,
      createdAtIso,
      label: `dynamic.${tool || "tool"}`,
      kind: "dynamicToolCall",
      status: record.status,
      durationMs: typeof record.durationMs === "number" ? record.durationMs : null,
      details: {
        tool,
        arguments: record.arguments,
        success: record.success,
        contentItems: record.contentItems,
      },
    });
  }

  if (sourceType === "collabAgentToolCall") {
    const tool = asString(record.tool, "collab");
    const receivers = Array.isArray(record.receiverThreadIds)
      ? (record.receiverThreadIds as unknown[]).length
      : 0;
    return normalizeToolItem(record, {
      id,
      turnId,
      turnIndex,
      displaySeq,
      createdAtIso,
      label: `collab.${tool}`,
      kind: "collabAgentToolCall",
      status: record.status,
      text: receivers > 0 ? `${tool} -> ${receivers} receiver(s)` : tool,
      details: {
        tool,
        status: record.status,
        senderThreadId: record.senderThreadId,
        receiverThreadIds: record.receiverThreadIds,
        prompt: record.prompt,
        model: record.model,
        reasoningEffort: record.reasoningEffort,
        agentsStates: record.agentsStates,
      },
    });
  }

  if (sourceType === "webSearch") {
    const query = asString(record.query).trim();
    const action = describeWebSearchAction(record.action);
    return normalizeToolItem(record, {
      id,
      turnId,
      turnIndex,
      displaySeq,
      createdAtIso,
      label: "web.search",
      kind: "webSearch",
      status: "completed",
      text: query ? `${query} (${action})` : action,
      details: {
        query: record.query,
        action: record.action,
      },
    });
  }

  if (sourceType === "imageView") {
    const path = asString(record.path).trim();
    return normalizeToolItem(record, {
      id,
      turnId,
      turnIndex,
      displaySeq,
      createdAtIso,
      label: "image.view",
      kind: "imageView",
      status: "completed",
      text: path ? `view ${path}` : "view image",
      details: {
        path: record.path,
      },
    });
  }

  if (sourceType === "imageGeneration") {
    const status = asString(record.status, "completed");
    const revisedPrompt = asString(record.revisedPrompt).trim();
    const result = asString(record.result).trim();
    return normalizeToolItem(record, {
      id,
      turnId,
      turnIndex,
      displaySeq,
      createdAtIso,
      label: "image.generate",
      kind: "imageGeneration",
      status,
      text: revisedPrompt || result || "image generation",
      details: {
        status,
        revisedPrompt: record.revisedPrompt,
        result: record.result,
        savedPath: record.savedPath,
      },
    });
  }

  if (sourceType === "enteredReviewMode") {
    const review = asString(record.review).trim();
    return {
      id,
      itemType: "worked",
      role: "system",
      text: review ? `Review started: ${review}` : "Review started",
      turnId,
      turnIndex,
      displaySeq,
      createdAtIso,
      completed: true,
      rawPayload: safeStringify(record),
    };
  }

  if (sourceType === "exitedReviewMode") {
    const review = asString(record.review).trim();
    return {
      id,
      itemType: "worked",
      role: "system",
      text: review ? `Review ended: ${review}` : "Review ended",
      turnId,
      turnIndex,
      displaySeq,
      createdAtIso,
      completed: true,
      rawPayload: safeStringify(record),
    };
  }

  if (sourceType === "hookPrompt") {
    return null;
  }

  if (sourceType === "plan") {
    return {
      id,
      itemType: "worked",
      role: "assistant",
      text: asString(record.text),
      turnId,
      turnIndex,
      displaySeq,
      createdAtIso,
      completed: true,
      rawPayload: safeStringify(record),
    };
  }

  if (sourceType === "contextCompaction") {
    return {
      id,
      itemType: "worked",
      role: "system",
      text: "Context compacted",
      turnId,
      turnIndex,
      displaySeq,
      createdAtIso,
      completed: true,
      rawPayload: safeStringify(record),
    };
  }

  return {
    id,
    itemType: "worked",
    role: "system",
    text: "",
    turnId,
    turnIndex,
    displaySeq,
    createdAtIso,
    completed: true,
    rawPayload: safeStringify(record),
  };
}

export function normalizeTimelineItem(input: unknown): UiTimelineItem {
  const record = asRecord(input);
  if (!record) {
    return {
      id: "",
      itemType: "unknown",
      role: "system",
      text: "",
      completed: false,
    };
  }

  const fromThreadItem = normalizeThreadItemAsTimeline(record);
  if (fromThreadItem) {
    return fromThreadItem;
  }

  const itemTypeRaw = asString(record.itemType, "unknown");
  const roleRaw = asString(record.role, "system");
  const role: "user" | "assistant" | "system" =
    roleRaw === "user" || roleRaw === "assistant" ? roleRaw : "system";
  const normalizedId = asString(record.id);
  if (!hasTimelineItemId(normalizedId)) {
    warnMissingTimelineItemId("normalizeTimelineItem", record);
    return {
      id: "",
      itemType: "unknown",
      role: "system",
      text: "",
      completed: false,
      rawPayload: safeStringify(record),
    };
  }

  return {
    id: normalizedId,
    itemType:
      itemTypeRaw === "user-message" ||
      itemTypeRaw === "assistant-message" ||
      itemTypeRaw === "reasoning" ||
      itemTypeRaw === "exec" ||
      itemTypeRaw === "mcp-tool-call" ||
      itemTypeRaw === "tool-call" ||
      itemTypeRaw === "worked"
        ? itemTypeRaw
        : "unknown",
    role,
    text: asString(record.text),
    status: asString(record.status, "") || undefined,
    turnId: asString(record.turnId, "") || undefined,
    turnIndex: typeof record.turnIndex === "number" ? record.turnIndex : undefined,
    displaySeq: typeof record.displaySeq === "number" ? record.displaySeq : undefined,
    createdAtIso: asString(record.createdAtIso, "") || undefined,
    completed: inferCompleted(record),
    images: Array.isArray(record.images) ? record.images.filter((x): x is string => typeof x === "string") : undefined,
    fileAttachments: Array.isArray(record.fileAttachments)
      ? record.fileAttachments
          .map((entry) => {
            const item = asRecord(entry);
            if (!item) {
              return null;
            }
            return {
              label: asString(item.label),
              path: asString(item.path),
            };
          })
          .filter((x): x is { label: string; path: string } => x !== null)
      : undefined,
    commandExecution: asRecord(record.commandExecution)
      ? {
          command: asString((record.commandExecution as Record<string, unknown>).command),
          cwd:
            typeof (record.commandExecution as Record<string, unknown>).cwd === "string"
              ? ((record.commandExecution as Record<string, unknown>).cwd as string)
              : null,
          status: (() => {
            return normalizeCommandExecutionStatus(
              (record.commandExecution as Record<string, unknown>).status,
            );
          })(),
          aggregatedOutput: asString((record.commandExecution as Record<string, unknown>).aggregatedOutput),
          exitCode:
            typeof (record.commandExecution as Record<string, unknown>).exitCode === "number"
              ? ((record.commandExecution as Record<string, unknown>).exitCode as number)
              : null,
        }
      : undefined,
    mcpToolCall: asRecord(record.mcpToolCall)
      ? {
          server: asString((record.mcpToolCall as Record<string, unknown>).server),
          tool: asString((record.mcpToolCall as Record<string, unknown>).tool),
          arguments: (record.mcpToolCall as Record<string, unknown>).arguments,
          result: (record.mcpToolCall as Record<string, unknown>).result,
          durationMs:
            typeof (record.mcpToolCall as Record<string, unknown>).durationMs === "number"
              ? ((record.mcpToolCall as Record<string, unknown>).durationMs as number)
              : null,
        }
      : undefined,
    toolCall: asRecord(record.toolCall)
      ? {
          kind: asString((record.toolCall as Record<string, unknown>).kind),
          label: asString((record.toolCall as Record<string, unknown>).label),
          status: asString((record.toolCall as Record<string, unknown>).status, "completed"),
          details: (record.toolCall as Record<string, unknown>).details,
          durationMs:
            typeof (record.toolCall as Record<string, unknown>).durationMs === "number"
              ? ((record.toolCall as Record<string, unknown>).durationMs as number)
              : null,
        }
      : undefined,
    rawPayload: asString(record.rawPayload, "") || undefined,
  };
}

// sortTimelineItems is now imported from ./sort.ts

function sortRequests(requests: UiServerRequest[]): UiServerRequest[] {
  return [...requests].sort((left, right) => {
    const leftSeq = typeof left.displaySeq === "number" ? left.displaySeq : Number.MAX_SAFE_INTEGER;
    const rightSeq = typeof right.displaySeq === "number" ? right.displaySeq : Number.MAX_SAFE_INTEGER;
    if (leftSeq !== rightSeq) {
      return leftSeq - rightSeq;
    }
    return left.id - right.id;
  });
}

export function normalizeTimelineSnapshot(input: unknown, fallbackThreadId: string): UiTimelineSnapshot {
  const record = asRecord(input);
  if (!record) {
    return {
      threadId: fallbackThreadId,
      runtime: normalizeRuntime(null),
      pendingRequests: [],
      pendingRequestSetVersion: 0,
      requestSetVersion: 0,
      items: [],
      totalCount: 0,
      requestedCount: 0,
      historyReset: false,
    };
  }

  const items = Array.isArray(record.items)
    ? record.items
        .map(normalizeTimelineItem)
        .filter((item) => {
          if (hasTimelineItemId(item.id)) {
            return true;
          }
          warnMissingTimelineItemId("normalizeTimelineSnapshot", item);
          return false;
        })
    : [];
  const pendingRequests = Array.isArray(record.pendingRequests)
    ? record.pendingRequests.map(normalizeServerRequest)
    : [];
  const requestedCountRaw = asNumber(record.requestedCount, NaN);
  const totalCountRaw = asNumber(record.totalCount, NaN);
  const historyResetRaw = asBoolean(record.historyReset, false);

  return {
    threadId: asString(record.threadId, fallbackThreadId),
    runtime: normalizeRuntime(record.runtime),
    pendingRequests: sortRequests(pendingRequests),
    pendingRequestSetVersion: asNumber(record.pendingRequestSetVersion, 0),
    requestSetVersion:
      typeof record.requestSetVersion === "number" ? record.requestSetVersion : undefined,
    items: sortTimelineItems(items),
    requestedCount: Number.isFinite(requestedCountRaw)
      ? Math.max(0, Math.trunc(requestedCountRaw))
      : undefined,
    totalCount: Number.isFinite(totalCountRaw)
      ? Math.max(0, Math.trunc(totalCountRaw))
      : undefined,
    historyReset: historyResetRaw ? true : undefined,
  };
}

export function normalizeTimelineEvent(input: unknown): UiTimelineEvent | null {
  const record = asRecord(input);
  if (!record) {
    return null;
  }

  const methodWithoutSeq = asString(record.method).trim();
  const params = asRecord(record.params) ?? {};
  const occurredAtIso = asString(
    record.atIso,
    asString(record.occurredAtIso, new Date().toISOString()),
  );

  if (methodWithoutSeq === "sdk/backfillStart") {
    return {
      eventType: "stream_backfill_started",
      occurredAtIso,
      payload: params,
    };
  }
  if (methodWithoutSeq === "sdk/backfillDone") {
    return {
      eventType: "stream_backfill_completed",
      occurredAtIso,
      payload: params,
    };
  }
  if (methodWithoutSeq === "sdk/resyncRequired") {
    return {
      eventType: "stream_resync_required",
      occurredAtIso,
      payload: params,
    };
  }

  const legacyEventType = asString(record.eventType, "").trim();
  if (legacyEventType) {
    return {
      eventType: legacyEventType,
      turnId: asString(record.turnId, "") || undefined,
      itemId: asString(record.itemId, "") || undefined,
      requestId: typeof record.requestId === "number" ? record.requestId : undefined,
      occurredAtIso,
      payload: record.payload,
    };
  }

  const method = methodWithoutSeq;
  if (!method) {
    return null;
  }

  const turnId = asString(record.turnId, asString(params.turnId, "")) || undefined;
  const itemId = asString(params.itemId, "") || undefined;
  const requestIdRaw = params.requestId;
  const requestId =
    typeof requestIdRaw === "number"
      ? requestIdRaw
      : typeof requestIdRaw === "string"
        ? Number.parseInt(requestIdRaw, 10)
        : undefined;
  const requestVersion = asNumber(params.requestVersion, Number.NaN);
  const pendingRequestSetVersion = asNumber(params.pendingRequestSetVersion, Number.NaN);
  const requestSetVersion = asNumber(params.requestSetVersion, Number.NaN);

  const withItemMetadata = (item: unknown): unknown => {
    const itemRecord = asRecord(item);
    if (!itemRecord) {
      return item;
    }
    return {
      ...itemRecord,
      turnId: asString(itemRecord.turnId, turnId ?? "") || undefined,
      id: asString(itemRecord.id, itemId ?? ""),
    };
  };

  if (method === "item/started") {
    return {
      eventType: "item_added",
      turnId,
      itemId,
      occurredAtIso,
      payload: { item: withItemMetadata(params.item) },
    };
  }

  if (method === "item/completed") {
    return {
      eventType: "item_finalized",
      turnId,
      itemId,
      occurredAtIso,
      payload: { item: withItemMetadata(params.item) },
    };
  }

  if (method === "turn/started") {
    const turn = asRecord(params.turn);
    return {
      eventType: "thread_runtime_changed",
      turnId: asString(turn?.id, turnId ?? "") || turnId,
      occurredAtIso,
      payload: {
        runtime: {
          inProgress: true,
          queuedCount: 0,
          activeTurnId: asString(turn?.id, turnId ?? "") || null,
          interruptRequested: false,
          lastError: null,
        },
      },
    };
  }

  if (method === "turn/completed") {
    return {
      eventType: "turn_finalized",
      turnId,
      occurredAtIso,
      payload: {
        turn: params.turn,
        runtime: {
          inProgress: false,
          queuedCount: 0,
          activeTurnId: null,
          interruptRequested: false,
          lastError: null,
        },
      },
    };
  }

  if (method === "serverRequest/added") {
    const requestRecordRaw = asRecord(params.request);
    const requestRecord = requestRecordRaw ?? params;
    const addedRequestId = asNumber(requestRecord.id, Number.NaN);
    const addedTurnId = asString(requestRecord.turnId, turnId ?? "") || turnId;
    return {
      eventType: "server_request_added",
      turnId: addedTurnId,
      requestId: Number.isFinite(addedRequestId) ? addedRequestId : undefined,
      occurredAtIso,
      payload: {
        request: requestRecord,
      },
    };
  }

  if (method === "serverRequest/resolved") {
    return {
      eventType: "server_request_resolved",
      turnId,
      requestId: Number.isFinite(requestId ?? NaN) ? requestId : undefined,
      occurredAtIso,
      payload: {
        id: Number.isFinite(requestId ?? NaN) ? requestId : undefined,
        requestVersion: Number.isFinite(requestVersion) ? requestVersion : undefined,
        pendingRequestSetVersion: Number.isFinite(pendingRequestSetVersion)
          ? pendingRequestSetVersion
          : undefined,
        requestSetVersion: Number.isFinite(requestSetVersion) ? requestSetVersion : undefined,
      },
    };
  }

  if (method === "sdk/lagged") {
    return {
      eventType: "stream_lagged",
      occurredAtIso,
      payload: {
        skipped: asNumber(params.skipped, 0),
      },
    };
  }

  if (method === "sdk/losslessOverflow") {
    return {
      eventType: "stream_resync_required",
      occurredAtIso,
      payload: params,
    };
  }

  if (method === "sdk/backfillStart") {
    return {
      eventType: "stream_backfill_started",
      occurredAtIso,
      payload: params,
    };
  }

  if (method === "sdk/backfillDone") {
    return {
      eventType: "stream_backfill_completed",
      occurredAtIso,
      payload: params,
    };
  }

  if (method === "sdk/resyncRequired") {
    return {
      eventType: "stream_resync_required",
      occurredAtIso,
      payload: params,
    };
  }

  if (method === "error") {
    const errorRecord = asRecord(params.error);
    const messageCandidate = asString(errorRecord?.message, asString(params.message, "")).trim();
    const additionalDetails = asString(errorRecord?.additionalDetails, "").trim();
    const message = additionalDetails || messageCandidate || "runtime error";
    const willRetry = asBoolean(params.willRetry, false);
    return {
      eventType: "thread_error",
      turnId,
      occurredAtIso,
      payload: {
        willRetry,
        error: errorRecord ?? params,
        runtime: {
          // Retryable errors (stream disconnect, provider hiccups) should not clear inProgress;
          // otherwise the Stop button gets disabled while the backend is still working/retrying.
          inProgress: willRetry,
          queuedCount: 0,
          activeTurnId: turnId ?? null,
          interruptRequested: false,
          lastError: message,
        },
      },
    };
  }

  return {
    eventType: "rpc_notification",
    turnId,
    itemId,
    requestId: Number.isFinite(requestId ?? NaN) ? requestId : undefined,
    occurredAtIso,
    payload: {
      method,
      params,
    },
  };
}

function mergeItem(items: UiTimelineItem[], item: UiTimelineItem): UiTimelineItem[] {
  const mergePreservingMetadata = (
    baseline: UiTimelineItem,
    live: UiTimelineItem,
  ): UiTimelineItem => {
    const merged: UiTimelineItem = {
      ...baseline,
      ...live,
    };
    // Preserve the insertion order for an item once it has been assigned.
    // TUI does not reorder transcript cells when later deltas/completions arrive.
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
    if ((!live.text || !live.text.trim()) && baseline.text) {
      merged.text = baseline.text;
    }
    if (baseline.completed && !live.completed) {
      merged.completed = true;
      if (baseline.status && (!live.status || live.status === "inProgress")) {
        merged.status = baseline.status;
      }
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
  };

  if (!item.id) {
    return items;
  }
  const index = items.findIndex((entry) => entry.id === item.id);
  if (index === -1) {
    return sortTimelineItems([...items, item]);
  }
  const next = [...items];
  next[index] = mergePreservingMetadata(next[index], item);
  return sortTimelineItems(next);
}

function mergeRequest(requests: UiServerRequest[], request: UiServerRequest): UiServerRequest[] {
  const index = requests.findIndex((entry) => entry.id === request.id);
  if (index === -1) {
    return sortRequests([...requests, request]);
  }
  const next = [...requests];
  next[index] = {
    ...next[index],
    ...request,
  };
  return sortRequests(next);
}

export function applyTimelineEvent(
  snapshot: UiTimelineSnapshot,
  event: UiTimelineEvent,
): UiTimelineSnapshot {
  const payload = asRecord(event.payload);
  let next = { ...snapshot };

  // The Web timeline ordering is based on arrival order, not server-provided cursors.
  // We still need a stable monotonic `displaySeq` to sort mixed baseline + live items.
  let nextDisplaySeq: number | null = null;
  const allocateDisplaySeq = (): number => {
    if (nextDisplaySeq === null) {
      const maxItemSeq = next.items.reduce((max, item) => {
        const seq = typeof item.displaySeq === "number" ? item.displaySeq : 0;
        return seq > max ? seq : max;
      }, 0);
      const maxRequestSeq = next.pendingRequests.reduce((max, request) => {
        const seq = typeof request.displaySeq === "number" ? request.displaySeq : 0;
        return seq > max ? seq : max;
      }, 0);
      nextDisplaySeq = Math.max(maxItemSeq, maxRequestSeq) + 1;
    }
    const value = nextDisplaySeq;
    nextDisplaySeq += 1;
    return value;
  };

  switch (event.eventType) {
    case "item_added":
    case "item_updated":
    case "item_finalized": {
      if (payload?.item) {
        const normalizedItem = normalizeTimelineItem(payload.item);
        if (!hasTimelineItemId(normalizedItem.id)) {
          warnMissingTimelineItemId("applyTimelineEvent", payload.item);
          break;
        }
        next = {
          ...next,
          items: mergeItem(
            next.items,
            normalizedItem.displaySeq === undefined
              ? {
                  ...normalizedItem,
                  displaySeq: allocateDisplaySeq(),
                }
              : normalizedItem,
          ),
        };
      }
      break;
    }
    case "thread_runtime_changed":
    case "thread_idle":
    case "interrupt_requested":
    case "thread_error": {
      if (payload?.runtime) {
        if (event.eventType === "thread_error") {
          const willRetry = asBoolean(payload.willRetry, false);
          if (!willRetry) {
            const runtime = normalizeRuntime(payload.runtime);
            const message = (runtime.lastError ?? "").trim();
            const errorTurnId = event.turnId?.trim() || undefined;
            const errorSeq = allocateDisplaySeq();
            const errorId = errorTurnId ? `turn-${errorTurnId}-error` : `thread-error-${errorSeq}`;
            const errorItem = buildTurnErrorItem({
              id: errorId,
              message,
              occurredAtIso: event.occurredAtIso,
              displaySeq: errorSeq,
              turnId: errorTurnId,
              rawPayload: payload,
            });
            if (errorItem) {
              next = {
                ...next,
                items: mergeItem(next.items, errorItem),
              };
            }
          }
        }
        next = {
          ...next,
          runtime: normalizeRuntime(payload.runtime),
        };
      } else if (event.eventType === "interrupt_requested") {
        next = {
          ...next,
          runtime: {
            ...next.runtime,
            interruptRequested: true,
          },
        };
      } else if (event.eventType === "thread_idle") {
        next = {
          ...next,
          runtime: {
            ...next.runtime,
            inProgress: false,
          },
        };
      }
      break;
    }
    case "turn_finalized": {
      const turn = payload?.turn && typeof payload.turn === "object" && !Array.isArray(payload.turn)
        ? (payload.turn as Record<string, unknown>)
        : null;
      const turnErrorMessage = normalizeTurnErrorMessage(turn);
      const finalizedTurnId = (event.turnId?.trim() || asString(turn?.id, "").trim()) || "";
      if (turnErrorMessage && finalizedTurnId) {
        const errorSeq = allocateDisplaySeq();
        const errorItem = buildTurnErrorItem({
          id: `turn-${finalizedTurnId}-error`,
          message: turnErrorMessage,
          occurredAtIso: event.occurredAtIso,
          displaySeq: errorSeq,
          turnId: finalizedTurnId,
          rawPayload: turn,
        });
        if (errorItem) {
          next = {
            ...next,
            items: mergeItem(next.items, errorItem),
          };
        }
      }
      if (payload?.runtime) {
        next = {
          ...next,
          runtime: normalizeRuntime(payload.runtime),
        };
      } else {
        next = {
          ...next,
          runtime: {
            ...next.runtime,
            inProgress: false,
          },
        };
      }
      break;
    }
    case "server_request_added": {
      if (payload?.request) {
        const request = normalizeServerRequest(payload.request);
        const requestWithSeq =
          typeof request.displaySeq === "number"
            ? request
            : {
                ...request,
                displaySeq: allocateDisplaySeq(),
              };
        next = {
          ...next,
          pendingRequests: mergeRequest(next.pendingRequests, requestWithSeq),
          pendingRequestSetVersion:
            typeof request.pendingRequestSetVersion === "number"
              ? request.pendingRequestSetVersion
              : next.pendingRequestSetVersion,
        };
      }
      break;
    }
    case "server_request_resolved": {
      const resolvedId = typeof event.requestId === "number" ? event.requestId : asNumber(payload?.id, NaN);
      if (Number.isFinite(resolvedId)) {
        const requestId = resolvedId as number;
        next = {
          ...next,
          pendingRequests: next.pendingRequests.filter((entry) => entry.id !== requestId),
        };
      }
      if (typeof payload?.pendingRequestSetVersion === "number") {
        next = {
          ...next,
          pendingRequestSetVersion: payload.pendingRequestSetVersion as number,
        };
      }
      break;
    }
    case "rpc_notification": {
      const method = asString(payload?.method, "").trim();
      const params = asRecord(payload?.params) ?? {};
      const itemId = event.itemId?.trim() || asString(params.itemId, "").trim();

      const ensurePlaceholderItem = (fallback: UiTimelineItem): UiTimelineItem => {
        const existing = next.items.find((entry) => entry.id === fallback.id);
        return existing ?? fallback;
      };

      const mergeItemUpdate = (item: UiTimelineItem) => {
        next = { ...next, items: mergeItem(next.items, item) };
      };

      if (method === "item/agentMessage/delta") {
        const delta = asString(params.delta, "");
        if (!itemId || !delta) {
          break;
        }
        const base = ensurePlaceholderItem({
          id: itemId,
          itemType: "assistant-message",
          role: "assistant",
          text: "",
          turnId: event.turnId,
          displaySeq: allocateDisplaySeq(),
          createdAtIso: event.occurredAtIso,
          completed: false,
        });
        mergeItemUpdate({ ...base, text: `${base.text}${delta}`, completed: false });
        break;
      }

      if (method === "item/plan/delta") {
        const delta = asString(params.delta, "");
        if (!itemId || !delta) {
          break;
        }
        const base = ensurePlaceholderItem({
          id: itemId,
          itemType: "worked",
          role: "assistant",
          text: "",
          turnId: event.turnId,
          displaySeq: allocateDisplaySeq(),
          createdAtIso: event.occurredAtIso,
          completed: false,
        });
        mergeItemUpdate({ ...base, text: `${base.text}${delta}`, completed: false });
        break;
      }

      if (method === "item/reasoning/summaryTextDelta" || method === "item/reasoning/textDelta") {
        const delta = asString(params.delta, "");
        if (!itemId || !delta) {
          break;
        }
        const base = ensurePlaceholderItem({
          id: itemId,
          itemType: "reasoning",
          role: "assistant",
          text: "",
          turnId: event.turnId,
          displaySeq: allocateDisplaySeq(),
          createdAtIso: event.occurredAtIso,
          completed: false,
        });
        mergeItemUpdate({ ...base, text: `${base.text}${delta}`, completed: false });
        break;
      }

      if (method === "item/reasoning/summaryPartAdded") {
        if (!itemId) {
          break;
        }
        const base = ensurePlaceholderItem({
          id: itemId,
          itemType: "reasoning",
          role: "assistant",
          text: "",
          turnId: event.turnId,
          displaySeq: allocateDisplaySeq(),
          createdAtIso: event.occurredAtIso,
          completed: false,
        });
        const nextText = base.text.trim().length > 0 ? `${base.text}\n\n` : base.text;
        mergeItemUpdate({ ...base, text: nextText, completed: false });
        break;
      }

      if (method === "item/commandExecution/outputDelta") {
        const delta = asString(params.delta, "");
        if (!itemId || !delta) {
          break;
        }
        const base = ensurePlaceholderItem({
          id: itemId,
          itemType: "exec",
          role: "system",
          text: "",
          status: "inProgress",
          turnId: event.turnId,
          displaySeq: allocateDisplaySeq(),
          createdAtIso: event.occurredAtIso,
          completed: false,
          commandExecution: {
            command: "",
            cwd: null,
            status: "inProgress",
            aggregatedOutput: "",
            exitCode: null,
          },
        });
        const priorOutput = base.commandExecution?.aggregatedOutput ?? "";
        const aggregatedOutput = `${priorOutput}${delta}`;
        mergeItemUpdate({
          ...base,
          text: aggregatedOutput || base.text,
          completed: false,
          commandExecution: base.commandExecution
            ? { ...base.commandExecution, aggregatedOutput }
            : base.commandExecution,
        });
        break;
      }

      break;
    }
    default: {
      break;
    }
  }

  return next;
}

export type TimelineMutableState = UiTimelineSnapshot;

export function fromSnapshot(snapshot: UiTimelineSnapshot): TimelineMutableState {
  return snapshot;
}

export { countHistoryItems, isCountableHistoryItem } from "./history_count";
