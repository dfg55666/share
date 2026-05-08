const THREAD_ID_TOKEN = "{threadId}";
const RUN_ID_TOKEN = "{runId}";
const DEFAULT_SEND_TEMPLATE = "/threads/{threadId}/turn/send";
const DEFAULT_TURN_CONTEXT_OVERRIDE_TEMPLATE =
  "/threads/{threadId}/turn/context/override";

const DEFAULT_RUN_NOTIFICATIONS_TEMPLATE = "/runs/{runId}/notifications";
const DEFAULT_RUN_READ_TEMPLATE = "/runs/{runId}/read";
const DEFAULT_RUN_READ_COUNTS_QUERY = "counts";
const DEFAULT_RUN_READ_COUNT_QUERY = "count";

function normalizeTemplate(value: string | undefined, fallback: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    return fallback;
  }
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function resolveThreadPathTemplate(template: string, threadId: string): string {
  const normalizedThreadId = threadId.trim();
  if (!normalizedThreadId) {
    throw new Error("threadId is required");
  }
  if (!template.includes(THREAD_ID_TOKEN)) {
    throw new Error(`runtime api template is missing ${THREAD_ID_TOKEN}: ${template}`);
  }
  return template.replaceAll(THREAD_ID_TOKEN, encodeURIComponent(normalizedThreadId));
}

function resolveRunPathTemplate(template: string, runId: string): string {
  const normalizedRunId = runId.trim();
  if (!normalizedRunId) {
    throw new Error("runId is required");
  }
  if (!template.includes(RUN_ID_TOKEN)) {
    throw new Error(`runtime api template is missing ${RUN_ID_TOKEN}: ${template}`);
  }
  return template.replaceAll(RUN_ID_TOKEN, encodeURIComponent(normalizedRunId));
}

function appendQuery(path: string, key: string, value: number): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${encodeURIComponent(key)}=${value}`;
}

function appendQueryString(path: string, key: string, value: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

const sendSteerTemplate = normalizeTemplate(
  import.meta.env.VITE_SBIRD_THREAD_SEND_PATH,
  DEFAULT_SEND_TEMPLATE,
);

const turnContextOverrideTemplate = normalizeTemplate(
  import.meta.env.VITE_SBIRD_THREAD_TURN_CONTEXT_OVERRIDE_PATH,
  DEFAULT_TURN_CONTEXT_OVERRIDE_TEMPLATE,
);

const runNotificationsTemplate = normalizeTemplate(
  import.meta.env.VITE_SBIRD_RUN_NOTIFICATIONS_PATH,
  DEFAULT_RUN_NOTIFICATIONS_TEMPLATE,
);
const runReadTemplate = normalizeTemplate(
  import.meta.env.VITE_SBIRD_RUN_READ_PATH,
  DEFAULT_RUN_READ_TEMPLATE,
);
const runReadCountsQuery = (
  import.meta.env.VITE_SBIRD_RUN_READ_COUNTS_QUERY ??
  DEFAULT_RUN_READ_COUNTS_QUERY
).trim() || DEFAULT_RUN_READ_COUNTS_QUERY;
const runReadCountQuery = (
  import.meta.env.VITE_SBIRD_RUN_READ_COUNT_QUERY ??
  DEFAULT_RUN_READ_COUNT_QUERY
).trim() || DEFAULT_RUN_READ_COUNT_QUERY;

export function buildThreadSendPath(threadId: string): string {
  return resolveThreadPathTemplate(sendSteerTemplate, threadId);
}

export function buildThreadTurnContextOverridePath(threadId: string): string {
  return resolveThreadPathTemplate(turnContextOverrideTemplate, threadId);
}

export function buildRunNotificationsPath(runId: string): string {
  return resolveRunPathTemplate(runNotificationsTemplate, runId);
}

export function buildRunReadPath(
  runId: string,
  options?: {
    count?: number;
    countsByThreadId?: Record<string, number>;
  },
): string {
  const basePath = resolveRunPathTemplate(runReadTemplate, runId);
  if (!options) {
    return basePath;
  }

  let path = basePath;
  if (typeof options.count === "number" && Number.isFinite(options.count)) {
    const normalizedCount = Math.max(0, Math.trunc(options.count));
    path = appendQuery(path, runReadCountQuery, normalizedCount);
  }

  const counts = options.countsByThreadId;
  if (counts && typeof counts === "object") {
    const serialized = JSON.stringify(counts);
    path = appendQueryString(path, runReadCountsQuery, serialized);
  }

  return path;
}
