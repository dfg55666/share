import type { EngineThreadDetail, ThreadStatusSnapshot } from "../../api/contracts";

export type { EngineThreadDetail, ThreadSummary } from "../../api/contracts";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function normalizeThreadStatus(value: unknown): ThreadStatusSnapshot {
  const record = asRecord(value);
  if (!record) {
    return { type: "notLoaded" };
  }
  const type = asString(record.type, "notLoaded").trim() || "notLoaded";
  const activeFlags = asStringArray(record.activeFlags).map((flag) => flag.trim()).filter(Boolean);
  return activeFlags.length > 0 ? { type, activeFlags } : { type };
}

export function normalizeThreadDetail(input: unknown, fallbackThreadId: string): EngineThreadDetail {
  const record = asRecord(input);
  if (!record) {
    return {
      runId: "",
      workflowKey: "",
      runRoot: "",
      agentId: "",
      threadId: fallbackThreadId,
      threadName: "",
      status: "",
      currentStep: "",
      currentAgent: "",
      lastError: null,
      activeInProcess: false,
      threadStatus: { type: "notLoaded" },
    };
  }

  const threadId = asString(record.threadId, fallbackThreadId).trim() || fallbackThreadId;

  return {
    runId: asString(record.runId, "").trim(),
    workflowKey: asString(record.workflowKey, "").trim(),
    runRoot: asString(record.runRoot, "").trim(),
    agentId: asString(record.agentId, "").trim(),
    threadId,
    threadName: asString(record.threadName, "").trim(),
    status: asString(record.status, "").trim(),
    currentStep: asString(record.currentStep, "").trim(),
    currentAgent: asString(record.currentAgent, "").trim(),
    lastError:
      typeof record.lastError === "string" && record.lastError.trim()
        ? record.lastError.trim()
        : null,
    activeInProcess: typeof record.activeInProcess === "boolean" ? record.activeInProcess : false,
    threadStatus: normalizeThreadStatus(record.threadStatus),
  };
}

