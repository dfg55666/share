import type {
  ThreadServerRequestReply,
  ThreadServerRequestReplyResponse,
  UiServerRequest,
} from "../../api/contracts";

export type {
  ThreadServerRequestReply,
  ThreadServerRequestReplyResponse,
  UiServerRequest,
} from "../../api/contracts";

export type RequestDecision = "accept" | "reject";

// Web runtime uses the /api thread request-reply contract directly.
export type ServerRequestReply = ThreadServerRequestReply;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function normalizeServerRequest(input: unknown): UiServerRequest {
  const record = asRecord(input);
  const now = new Date().toISOString();

  if (!record) {
    return {
      id: 0,
      method: "",
      threadId: "",
      turnId: "",
      itemId: "",
      receivedAtIso: now,
      params: null,
    };
  }

  return {
    id: asNumber(record.id, 0),
    method: asString(record.method),
    threadId: asString(record.threadId),
    turnId: asString(record.turnId),
    itemId: asString(record.itemId),
    receivedAtIso: asString(record.receivedAtIso, now),
    requestVersion: typeof record.requestVersion === "number" ? record.requestVersion : undefined,
    pendingRequestSetVersion:
      typeof record.pendingRequestSetVersion === "number"
        ? record.pendingRequestSetVersion
        : undefined,
    requestSetVersion:
      typeof record.requestSetVersion === "number" ? record.requestSetVersion : undefined,
    displaySeq: typeof record.displaySeq === "number" ? record.displaySeq : undefined,
    params: record.params,
  };
}

export function buildRequestDecisionReply(
  request: UiServerRequest,
  pendingRequestSetVersion: number,
  decision: RequestDecision,
): ServerRequestReply {
  return {
    id: request.id,
    requestVersion: request.requestVersion,
    expectedPendingRequestSetVersion: pendingRequestSetVersion,
    result: { decision },
  };
}

export function buildRequestErrorReply(
  request: UiServerRequest,
  pendingRequestSetVersion: number,
  message: string,
): ServerRequestReply {
  return {
    id: request.id,
    requestVersion: request.requestVersion,
    expectedPendingRequestSetVersion: pendingRequestSetVersion,
    error: { message },
  };
}

export function buildServerRequestReply(
  reply: ServerRequestReply,
  pendingRequestSetVersion?: number,
): ThreadServerRequestReply {
  const expectedVersion =
    typeof reply.expectedPendingRequestSetVersion === "number"
      ? reply.expectedPendingRequestSetVersion
      : pendingRequestSetVersion;

  if (typeof expectedVersion !== "number" || !Number.isFinite(expectedVersion)) {
    throw new Error("expectedPendingRequestSetVersion is required to respond to server requests");
  }

  return {
    id: reply.id,
    requestVersion: reply.requestVersion,
    expectedPendingRequestSetVersion: expectedVersion,
    result: reply.result,
    error: reply.error,
  };
}
