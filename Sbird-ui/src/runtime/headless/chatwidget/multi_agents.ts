// Phase 1: TUI -> Web semantic port of `multi_agents.rs`.
//
// The upstream module focuses on *presentation contracts* for multi-agent
// events (spawn/interact/wait/resume/close) and navigation shortcuts. The
// terminal rendering is replaced by a lightweight `RtLine[]` model rendered by
// React in Phase 2.

import { PlainHistoryCell } from "./history_cell";
import * as key_hint from "./key_hint";
import type { KeyBinding } from "./key_hint";
import { prefixLines, type RtLine, type RtSpan, type RtStyle } from "../render/line_utils";

const COLLAB_PROMPT_PREVIEW_GRAPHEMES = 160;
const COLLAB_AGENT_ERROR_PREVIEW_GRAPHEMES = 160;
const COLLAB_AGENT_RESPONSE_PREVIEW_GRAPHEMES = 240;

export type ReasoningEffortConfig = "none" | "minimal" | "low" | "medium" | "high" | "xhigh";

export type AgentPickerThreadEntry = {
  agent_nickname?: string | null;
  agent_role?: string | null;
  is_closed: boolean;
};

export type SpawnRequestSummary = {
  model: string;
  reasoning_effort: ReasoningEffortConfig;
};

type AgentLabel = {
  thread_id?: string | null;
  nickname?: string | null;
  role?: string | null;
};

export function agent_picker_status_dot_spans(is_closed: boolean): RtSpan[] {
  const dot: RtSpan = is_closed ? { content: "•" } : { content: "•", style: { fg: "green" } };
  return [dot, { content: " " }];
}

export function format_agent_picker_item_name(
  agent_nickname: string | undefined | null,
  agent_role: string | undefined | null,
  is_primary: boolean,
): string {
  if (is_primary) return "Main [default]";
  const nickname = agent_nickname?.trim() || null;
  const role = agent_role?.trim() || null;
  if (nickname && role) return `${nickname} [${role}]`;
  if (nickname && !role) return nickname;
  if (!nickname && role) return `[${role}]`;
  return "Agent";
}

export function previous_agent_shortcut(): KeyBinding {
  return key_hint.alt("ArrowLeft");
}

export function next_agent_shortcut(): KeyBinding {
  return key_hint.alt("ArrowRight");
}

function isMacLike(): boolean {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
}

function previous_agent_word_motion_fallback(
  key_event: KeyboardEvent,
  allow_word_motion_fallback: boolean,
): boolean {
  // Mirrors upstream macOS fallback (Option+b/f emitted as word-motion when
  // enhanced keyboard reporting is unavailable). Only enable when composer is empty.
  return (
    isMacLike() &&
    allow_word_motion_fallback &&
    key_event.altKey &&
    !key_event.ctrlKey &&
    !key_event.shiftKey &&
    (key_event.key === "b" || key_event.key === "B")
  );
}

function next_agent_word_motion_fallback(
  key_event: KeyboardEvent,
  allow_word_motion_fallback: boolean,
): boolean {
  return (
    isMacLike() &&
    allow_word_motion_fallback &&
    key_event.altKey &&
    !key_event.ctrlKey &&
    !key_event.shiftKey &&
    (key_event.key === "f" || key_event.key === "F")
  );
}

export function previous_agent_shortcut_matches(
  key_event: KeyboardEvent,
  allow_word_motion_fallback: boolean,
): boolean {
  return (
    previous_agent_shortcut().isPress(key_event) ||
    previous_agent_word_motion_fallback(key_event, allow_word_motion_fallback)
  );
}

export function next_agent_shortcut_matches(
  key_event: KeyboardEvent,
  allow_word_motion_fallback: boolean,
): boolean {
  return (
    next_agent_shortcut().isPress(key_event) ||
    next_agent_word_motion_fallback(key_event, allow_word_motion_fallback)
  );
}

function span(content: string, style?: RtStyle): RtSpan {
  return style ? { content, style } : { content };
}

function lineFromSpans(spans: RtSpan[], style?: RtStyle): RtLine {
  return { style, spans };
}

function titleLine(spans: RtSpan[]): RtLine {
  return lineFromSpans([span("• ", { dim: true }), ...spans]);
}

function truncate_text(text: string, maxGraphemes: number): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const Segmenter = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (!Segmenter) {
    return trimmed.length > maxGraphemes ? trimmed.slice(0, maxGraphemes) : trimmed;
  }
  const seg = new Segmenter(undefined, { granularity: "grapheme" });
  let out = "";
  let count = 0;
  for (const part of seg.segment(trimmed)) {
    if (count >= maxGraphemes) break;
    out += part.segment;
    count += 1;
  }
  return out;
}

function agentLabelSpans(agent: AgentLabel): RtSpan[] {
  const nickname = agent.nickname?.trim() || null;
  const role = agent.role?.trim() || null;

  const spans: RtSpan[] = [];
  if (nickname) {
    spans.push(span(nickname, { fg: "rgb(0, 194, 194)", bold: true }));
  } else if (agent.thread_id) {
    spans.push(span(String(agent.thread_id), { fg: "rgb(0, 194, 194)" }));
  } else {
    spans.push(span("agent", { fg: "rgb(0, 194, 194)" }));
  }

  if (role) {
    spans.push(span(" ", { dim: true }));
    spans.push(span(`[${role}]`));
  }
  return spans;
}

function spawnRequestSpans(spawn_request?: SpawnRequestSummary | null): RtSpan[] {
  if (!spawn_request) return [];
  const model = (spawn_request.model ?? "").trim();
  const effort = spawn_request.reasoning_effort;
  if (!model && effort === "none") return [];
  const details = model ? `(${model} ${effort})` : `(${effort})`;
  return [span(" ", { dim: true }), span(details, { fg: "magenta" })];
}

function promptLine(prompt: string): RtLine | null {
  const trimmed = prompt.trim();
  if (!trimmed) return null;
  return lineFromSpans([span(truncate_text(trimmed, COLLAB_PROMPT_PREVIEW_GRAPHEMES))]);
}

function collabEvent(title: RtLine, details: RtLine[]): PlainHistoryCell {
  const lines: RtLine[] = [title];
  if (details.length) {
    lines.push(
      ...prefixLines(
        details,
        span("  └ ", { dim: true }),
        span("    "),
      ),
    );
  }
  return new PlainHistoryCell(lines);
}

function titleText(title: string): RtLine {
  return titleLine([span(title, { bold: true })]);
}

function titleWithAgent(prefix: string, agent: AgentLabel, spawn_request?: SpawnRequestSummary | null): RtLine {
  return titleLine([span(`${prefix} `, { bold: true }), ...agentLabelSpans(agent), ...spawnRequestSpans(spawn_request)]);
}

type AgentStatus =
  | "pending_init"
  | "running"
  | "interrupted"
  | { kind: "completed"; message?: string | null }
  | { kind: "errored"; error: string }
  | "shutdown"
  | "not_found"
  | { raw: unknown };

function normalizeAgentStatus(status: unknown): AgentStatus {
  if (typeof status === "string") {
    const lower = status.toLowerCase();
    if (lower === "pendinginit" || lower === "pending_init") return "pending_init";
    if (lower === "running") return "running";
    if (lower === "interrupted") return "interrupted";
    if (lower === "shutdown") return "shutdown";
    if (lower === "notfound" || lower === "not_found") return "not_found";
    return { raw: status };
  }
  if (status && typeof status === "object") {
    const record = status as Record<string, unknown>;
    const kind = typeof record.kind === "string" ? record.kind.toLowerCase() : "";
    if (kind === "completed") return { kind: "completed", message: typeof record.message === "string" ? record.message : null };
    if (kind === "errored") return { kind: "errored", error: typeof record.error === "string" ? record.error : String(record.error ?? "") };
  }
  return { raw: status };
}

function statusSummarySpans(status: unknown): RtSpan[] {
  const s = normalizeAgentStatus(status);
  if (s === "pending_init") return [span("Pending init", { fg: "rgb(0, 194, 194)" })];
  if (s === "running") return [span("Running", { fg: "rgb(0, 194, 194)", bold: true })];
  if (s === "interrupted") return [span("Interrupted", { fg: "orange" })];
  if (s === "shutdown") return [span("Shutdown")];
  if (s === "not_found") return [span("Not found", { fg: "red" })];
  if (typeof s === "object" && "kind" in s && s.kind === "completed") {
    const spans: RtSpan[] = [span("Completed", { fg: "green" })];
    const message = (s.message ?? "").split(/\s+/).join(" ").trim();
    const preview = message ? truncate_text(message, COLLAB_AGENT_RESPONSE_PREVIEW_GRAPHEMES) : "";
    if (preview) {
      spans.push(span(" - ", { dim: true }));
      spans.push(span(preview));
    }
    return spans;
  }
  if (typeof s === "object" && "kind" in s && s.kind === "errored") {
    const spans: RtSpan[] = [span("Error", { fg: "red" })];
    const message = (s.error ?? "").split(/\s+/).join(" ").trim();
    const preview = message ? truncate_text(message, COLLAB_AGENT_ERROR_PREVIEW_GRAPHEMES) : "";
    if (preview) {
      spans.push(span(" - ", { dim: true }));
      spans.push(span(preview));
    }
    return spans;
  }
  return [span("Unknown")];
}

function statusSummaryLine(status: unknown): RtLine {
  return lineFromSpans(statusSummarySpans(status));
}

export function spawn_end(
  ev: {
    new_thread_id?: string | null;
    new_agent_nickname?: string | null;
    new_agent_role?: string | null;
    prompt?: string;
  },
  spawn_request?: SpawnRequestSummary | null,
): PlainHistoryCell {
  const title = ev.new_thread_id
    ? titleWithAgent(
        "Spawned",
        {
          thread_id: ev.new_thread_id,
          nickname: ev.new_agent_nickname ?? null,
          role: ev.new_agent_role ?? null,
        },
        spawn_request,
      )
    : titleText("Agent spawn failed");

  const details: RtLine[] = [];
  const prompt = ev.prompt ?? "";
  const promptL = promptLine(prompt);
  if (promptL) details.push(promptL);
  return collabEvent(title, details);
}

export function interaction_end(ev: {
  receiver_thread_id: string;
  receiver_agent_nickname?: string | null;
  receiver_agent_role?: string | null;
  prompt?: string;
}): PlainHistoryCell {
  const title = titleWithAgent(
    "Sent input to",
    {
      thread_id: ev.receiver_thread_id,
      nickname: ev.receiver_agent_nickname ?? null,
      role: ev.receiver_agent_role ?? null,
    },
    null,
  );

  const details: RtLine[] = [];
  const promptL = promptLine(ev.prompt ?? "");
  if (promptL) details.push(promptL);
  return collabEvent(title, details);
}

export function waiting_begin(ev: {
  receiver_thread_ids?: string[];
  receiver_agents?: Array<{ thread_id: string; agent_nickname?: string | null; agent_role?: string | null }>;
}): PlainHistoryCell {
  const receiverAgents = (ev.receiver_agents ?? []).length
    ? (ev.receiver_agents ?? [])
    : (ev.receiver_thread_ids ?? []).map((thread_id) => ({ thread_id, agent_nickname: null, agent_role: null }));

  const title =
    receiverAgents.length === 1
      ? titleWithAgent("Waiting for", { thread_id: receiverAgents[0]!.thread_id, nickname: receiverAgents[0]!.agent_nickname ?? null, role: receiverAgents[0]!.agent_role ?? null }, null)
      : receiverAgents.length === 0
        ? titleText("Waiting for agents")
        : titleText(`Waiting for ${receiverAgents.length} agents`);

  const details: RtLine[] =
    receiverAgents.length > 1
      ? receiverAgents.map((agent) =>
          lineFromSpans(agentLabelSpans({ thread_id: agent.thread_id, nickname: agent.agent_nickname ?? null, role: agent.agent_role ?? null })),
        )
      : [];

  return collabEvent(title, details);
}

export function waiting_end(ev: {
  agent_statuses?: Array<{ thread_id: string; agent_nickname?: string | null; agent_role?: string | null; status: unknown }>;
  statuses?: Record<string, unknown>;
}): PlainHistoryCell {
  const statuses = ev.statuses ?? {};
  const entries: Array<{ thread_id: string; agent_nickname?: string | null; agent_role?: string | null; status: unknown }> =
    (ev.agent_statuses ?? []).length
      ? [...(ev.agent_statuses ?? [])]
      : Object.entries(statuses).map(([thread_id, status]) => ({ thread_id, status }));

  if (!entries.length) {
    return collabEvent(titleText("Finished waiting"), [lineFromSpans([span("No agents completed yet")])]);
  }

  entries.sort((a, b) => a.thread_id.localeCompare(b.thread_id));
  const details = entries.map((entry) => {
    const spans = [
      ...agentLabelSpans({ thread_id: entry.thread_id, nickname: entry.agent_nickname ?? null, role: entry.agent_role ?? null }),
      span(": ", { dim: true }),
      ...statusSummarySpans(entry.status),
    ];
    return lineFromSpans(spans);
  });
  return collabEvent(titleText("Finished waiting"), details);
}

export function close_end(ev: {
  receiver_thread_id: string;
  receiver_agent_nickname?: string | null;
  receiver_agent_role?: string | null;
}): PlainHistoryCell {
  return collabEvent(
    titleWithAgent(
      "Closed",
      { thread_id: ev.receiver_thread_id, nickname: ev.receiver_agent_nickname ?? null, role: ev.receiver_agent_role ?? null },
      null,
    ),
    [],
  );
}

export function resume_begin(ev: {
  receiver_thread_id: string;
  receiver_agent_nickname?: string | null;
  receiver_agent_role?: string | null;
}): PlainHistoryCell {
  return collabEvent(
    titleWithAgent(
      "Resuming",
      { thread_id: ev.receiver_thread_id, nickname: ev.receiver_agent_nickname ?? null, role: ev.receiver_agent_role ?? null },
      null,
    ),
    [],
  );
}

export function resume_end(ev: {
  receiver_thread_id: string;
  receiver_agent_nickname?: string | null;
  receiver_agent_role?: string | null;
  status: unknown;
}): PlainHistoryCell {
  return collabEvent(
    titleWithAgent(
      "Resumed",
      { thread_id: ev.receiver_thread_id, nickname: ev.receiver_agent_nickname ?? null, role: ev.receiver_agent_role ?? null },
      null,
    ),
    [statusSummaryLine(ev.status)],
  );
}
