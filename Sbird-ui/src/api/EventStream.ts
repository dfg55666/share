import { buildRunNotificationsPath } from "./RuntimeApi";
import type { UiTimelineEvent } from "./contracts";
import { normalizeTimelineEvent } from "../domain/timeline";

export type TimelineEventStreamHandle = {
  close: () => void;
};

export type RunTimelineEventStreamCallbacks = {
  onOpen?: () => void;
  onEvent: (threadId: string, event: UiTimelineEvent) => void;
  onError?: (error: Error) => void;
};

export function openRunTimelineEventStream(
  runId: string,
  options: { apiPrefix?: string },
  callbacks: RunTimelineEventStreamCallbacks,
): TimelineEventStreamHandle {
  const apiPrefix = (options.apiPrefix ?? "/api").replace(/\/+$/, "");
  const path = buildRunNotificationsPath(runId);
  const url = `${apiPrefix}${path}`;
  const source = new EventSource(url);
  let lastEventId = "";

  const formatContext = (): string => {
    const details = [
      `run=${runId}`,
      `url=${url}`,
      `lastEventId=${lastEventId || "none"}`,
      `readyState=${source.readyState}`,
    ];
    return details.join(" ");
  };

  const asRecord = (value: unknown): Record<string, unknown> | null => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  };

  const asString = (value: unknown): string => (typeof value === "string" ? value : "");

  const resolveThreadId = (value: unknown): string => {
    const record = asRecord(value);
    if (!record) return "";
    const topLevel = asString(record.threadId).trim();
    if (topLevel) return topLevel;
    const params = asRecord(record.params);
    const nested = asString(params?.threadId).trim();
    return nested;
  };

  const pushEvent = (threadId: string, raw: unknown): boolean => {
    const event = normalizeTimelineEvent(raw);
    if (!event) {
      return false;
    }
    callbacks.onEvent(threadId, event);
    return true;
  };

  const tryPushBatchEvent = (scope: string, parsed: unknown): boolean => {
    const record = asRecord(parsed);
    const events = Array.isArray(record?.events) ? record.events : null;
    if (!events) {
      const threadId = resolveThreadId(parsed);
      return threadId ? pushEvent(threadId, parsed) : false;
    }

    let processed = 0;
    for (const entry of events) {
      const threadId = resolveThreadId(entry);
      if (!threadId || !pushEvent(threadId, entry)) {
        callbacks.onError?.(
          new Error(
            `Timeline SSE payload_parse_error (${scope}) ${formatContext()} cause=batch_event_invalid index=${processed}`,
          ),
        );
        return false;
      }
      processed += 1;
    }
    return true;
  };

  const reportParseError = (scope: string, cause: unknown) => {
    const reason =
      cause instanceof Error ? cause.message : "unknown payload parse failure";
    callbacks.onError?.(
      new Error(`Timeline SSE payload_parse_error (${scope}) ${formatContext()} cause=${reason}`),
    );
  };

  const handleDataEvent = (scope: string, message: MessageEvent<string>) => {
    if (message.lastEventId?.trim()) {
      lastEventId = message.lastEventId.trim();
    }
    try {
      const parsed = JSON.parse(message.data);
      if (!tryPushBatchEvent(scope, parsed)) {
        const threadId = resolveThreadId(parsed);
        callbacks.onError?.(
          new Error(
            `Timeline SSE payload_parse_error (${scope}) ${formatContext()} cause=missing_threadId thread=${threadId || "none"}`,
          ),
        );
      }
    } catch (error) {
      reportParseError(scope, error);
    }
  };

  source.onopen = () => {
    callbacks.onOpen?.();
  };

  source.onerror = (event) => {
    const transport =
      event instanceof Event ? event.type : "unknown_transport_error";
    callbacks.onError?.(
      new Error(`Timeline SSE transport_error ${formatContext()} transport=${transport}`),
    );
  };

  source.onmessage = (message) => {
    handleDataEvent("message", message);
  };

  source.addEventListener("timeline", (raw) => {
    handleDataEvent("timeline", raw as MessageEvent<string>);
  });

  return {
    close: () => source.close(),
  };
}

