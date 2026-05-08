// Web Phase 1 port of the Rust TUI `ChatWidget` (conversation surface).
//
// The upstream Rust implementation consumes protocol events and produces a stream-aware
// transcript model. On the web side, the authoritative state comes from the `/api` timeline
// snapshot + events stream, but we keep the same "widget owns transcript cells" boundary so
// Phase 2 can cleanly separate core/runtime vs React view composition.

import type {
  UiServerRequest,
  UiThreadRuntime,
  UiTimelineItem,
  UiTimelineSnapshot,
} from "../../../api/contracts";
import { TOOL_CALL_MAX_LINES, outputLines } from "../render/common/exec_cell";
import { format_and_truncate_tool_result, format_json_compact, truncate_text } from "../render/common/text_formatting";
import { appendMarkdown } from "../render/common/markdown";
import {
  AgentMessageCell,
  ExpandableHistoryCell,
  PlainHistoryCell,
  UserHistoryCell,
  type HistoryCell,
} from "./history_cell";
import { InterruptManager, type InterruptConsumer } from "./interrupts";
import type { RtLine, RtSpan, RtStyle } from "../render/line_utils";

function lineFromSpans(spans: RtSpan[], style?: RtStyle): RtLine {
  return { style, spans };
}

function textLine(content: string, style?: RtStyle): RtLine {
  return { style, spans: [{ content }] };
}

function renderMarkdownToLines(markdown: string, cwd: string, width: number | null): RtLine[] {
  const lines: RtLine[] = [];
  appendMarkdown(markdown ?? "", width, cwd, lines);
  if (lines.length === 0) {
    lines.push(textLine(""));
  }
  return lines;
}

function splitLines(value: string): string[] {
  if (!value) return [];
  return value.replace(/\r\n/g, "\n").split("\n");
}

function truncateLinesMiddle(
  lines: string[],
  maxRows: number,
  omittedHint: number | null,
  ellipsisPrefix: string,
): string[] {
  const limit = Math.max(0, Math.floor(maxRows));
  if (limit <= 0) return [];
  if (lines.length <= limit) return lines;

  const hasHint =
    typeof omittedHint === "number" && Number.isFinite(omittedHint) && omittedHint > 0;
  const base = hasHint ? omittedHint : 0;
  const estimatedOmitted = base + Math.max(0, lines.length - (hasHint ? 1 : 0));

  // Reserve one row for the ellipsis itself.
  if (limit === 1) {
    return [`${ellipsisPrefix}… +${estimatedOmitted} lines`];
  }

  const available = limit - 1;
  const headBudget = Math.floor(available / 2);
  const tailBudget = available - headBudget;

  const headEnd = Math.min(lines.length, headBudget);
  const tailStart = Math.max(headEnd, lines.length - tailBudget);
  const headLines = lines.slice(0, headEnd);
  const tailLines = lines.slice(tailStart);

  const additional = Math.max(
    0,
    lines.length - headLines.length - tailLines.length - (hasHint ? 1 : 0),
  );

  return [
    ...headLines,
    `${ellipsisPrefix}… +${base + additional} lines`,
    ...tailLines,
  ];
}

function renderUserItem(item: UiTimelineItem): HistoryCell {
  return new UserHistoryCell({
    message: item.text ?? "",
    textElements: [],
    localImagePaths: (item.fileAttachments ?? [])
      .map((attachment) => attachment.path)
      .filter((path) => path.trim().length > 0),
    remoteImageUrls: (item.images ?? []).filter((url) => url.trim().length > 0),
  });
}

function renderAssistantItem(item: UiTimelineItem, cwd: string, width: number | null): HistoryCell {
  const lines = renderMarkdownToLines(item.text ?? "", cwd, width);
  return new AgentMessageCell(lines, /*isFirstLine*/ true);
}

function renderReasoningItem(item: UiTimelineItem): HistoryCell {
  const lines: RtLine[] = [];
  lines.push(
    lineFromSpans([{ content: "• " }, { content: "Reasoning", style: { dim: true, italic: true } }]),
  );
  for (const part of (item.text ?? "").split("\n")) {
    lines.push(textLine(`  ${part}`, { dim: true }));
  }
  return new PlainHistoryCell(lines);
}

function singleLineSummary(value: string): string {
  return value.replace(/\r\n|\r|\n/g, " ").replace(/\s+/g, " ").trim();
}

function renderExecHeaderLines(item: UiTimelineItem, width: number | null): RtLine[] {
  const lines: RtLine[] = [];
  const exec = item.commandExecution;
  const title = exec?.status === "inProgress" ? "Running" : "Ran";
  const commandSummary = singleLineSummary(exec?.command ?? "");
  const command = commandSummary || "(unknown command)";
  const commandBudget = Math.max(24, Math.floor((width ?? 120) - 14));
  const displayCommand = truncate_text(command, commandBudget);

  lines.push(
    lineFromSpans([
      { content: "• " },
      { content: `${title}: `, style: { bold: true } },
      { content: displayCommand },
    ], { clampLines: 1 }),
  );
  return lines;
}

function renderExecCollapsed(item: UiTimelineItem, headerLines: RtLine[]): RtLine[] {
  const exec = item.commandExecution;
  const lines = [...headerLines];
  const output = exec?.aggregatedOutput ?? "";
  const trimmedOutput = output.trimEnd();
  if (trimmedOutput) {
    const rendered = outputLines(
      {
        exitCode: typeof exec?.exitCode === "number" ? exec.exitCode : 0,
        aggregatedOutput: trimmedOutput,
        formattedOutput: trimmedOutput,
      },
      {
        lineLimit: TOOL_CALL_MAX_LINES,
        onlyErr: false,
        includeAnglePipe: false,
        includePrefix: false,
      },
    );
    const prefixed = rendered.lines.map((line, idx) =>
      `${idx === 0 ? "  └ " : "    "}${line}`,
    );
    const maxRows = TOOL_CALL_MAX_LINES;
    const truncated = truncateLinesMiddle(prefixed, maxRows, rendered.omitted, "    ");
    for (const raw of truncated) {
      lines.push(textLine(raw, { dim: true }));
    }
  } else if (exec && exec.status !== "inProgress") {
    lines.push(textLine("  └ (no output)", { dim: true }));
  }

  return lines;
}

function renderExecExpanded(item: UiTimelineItem, headerLines: RtLine[]): RtLine[] {
  const exec = item.commandExecution;
  const lines = [...headerLines];
  const output = exec?.aggregatedOutput ?? "";
  const trimmedOutput = output.trimEnd();
  if (trimmedOutput) {
    const rawLines = splitLines(trimmedOutput);
    for (let idx = 0; idx < rawLines.length; idx += 1) {
      const prefix = idx === 0 ? "  └ " : "    ";
      lines.push(textLine(`${prefix}${rawLines[idx] ?? ""}`, { dim: true }));
    }
  } else if (exec && exec.status !== "inProgress") {
    lines.push(textLine("  └ (no output)", { dim: true }));
  }
  return lines;
}

function renderExecItem(item: UiTimelineItem, width: number | null): HistoryCell {
  const headerLines = renderExecHeaderLines(item, width);
  const exec = item.commandExecution;
  const output = exec?.aggregatedOutput ?? "";
  const trimmedOutput = output.trimEnd();
  const rawLineCount = trimmedOutput ? splitLines(trimmedOutput).length : 0;

  const collapsed = renderExecCollapsed(item, headerLines);
  if (!trimmedOutput || rawLineCount <= TOOL_CALL_MAX_LINES) {
    return new PlainHistoryCell(collapsed);
  }

  return new ExpandableHistoryCell({
    kind: "exec",
    collapsed,
    expanded: () => renderExecExpanded(item, headerLines),
  });
}

function prettyValueLines(value: unknown): string[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return splitLines(JSON.stringify(parsed, null, 2) ?? trimmed);
    } catch {
      return splitLines(value);
    }
  }
  try {
    return splitLines(JSON.stringify(value, null, 2) ?? String(value));
  } catch {
    return splitLines(String(value));
  }
}

function renderMcpItem(item: UiTimelineItem, width: number | null): HistoryCell {
  const headerLines: RtLine[] = [];
  const call = item.mcpToolCall;
  const label = call ? `${call.server}.${call.tool}` : "mcp-tool-call";
  const args =
    call?.arguments !== undefined
      ? format_json_compact(safeJson(call.arguments) ?? "") ?? safeJson(call.arguments)
      : "";
  headerLines.push(
    lineFromSpans([
      { content: "• " },
      { content: "Tool", style: { bold: true } },
      { content: ` ${label}` },
      ...(args ? [{ content: "(" }, { content: args, style: { dim: true } }, { content: ")" }] : []),
    ]),
  );

  if (call?.result === undefined) {
    return new PlainHistoryCell(headerLines);
  }

  const detailWidth = Math.max(1, Math.floor((width ?? 120) - 4));
  const rendered = format_and_truncate_tool_result(
    safeJson(call.result) ?? String(call.result),
    TOOL_CALL_MAX_LINES,
    detailWidth,
  );
  const collapsed = [
    ...headerLines,
    textLine(`  └ ${rendered}`, { dim: true, clampLines: TOOL_CALL_MAX_LINES }),
  ];

  return new ExpandableHistoryCell({
    kind: "mcp_tool_call",
    collapsed,
    expanded: () => {
      const expanded = [...headerLines];
      const detailLines = prettyValueLines(call.result);
      if (detailLines.length === 0) {
        expanded.push(textLine("  └ (no result)", { dim: true }));
        return expanded;
      }
      for (let idx = 0; idx < detailLines.length; idx += 1) {
        const prefix = idx === 0 ? "  └ " : "    ";
        expanded.push(textLine(`${prefix}${detailLines[idx] ?? ""}`, { dim: true }));
      }
      return expanded;
    },
  });
}

function renderWorkedItem(item: UiTimelineItem): HistoryCell {
  const lines: RtLine[] = [];
  lines.push(lineFromSpans([{ content: "• " }, { content: "Worked", style: { bold: true } }]));
  for (const part of (item.text ?? "").split("\n")) {
    lines.push(textLine(`  ${part}`));
  }
  return new PlainHistoryCell(lines);
}

function renderToolCallItem(item: UiTimelineItem, width: number | null): HistoryCell {
  const header: RtLine[] = [];
  const label = item.toolCall?.label ?? item.toolCall?.kind ?? item.text ?? "tool-call";
  header.push(
    lineFromSpans([
      { content: "• " },
      { content: "Tool", style: { bold: true } },
      { content: ` ${label}` },
    ]),
  );

  const collapsed = [...header];
  const expanded = [...header];
  if (item.toolCall?.status) {
    const statusLine = textLine(`  status: ${item.toolCall.status}`, { dim: true });
    collapsed.push(statusLine);
    expanded.push(statusLine);
  }
  if (item.toolCall?.details === undefined) {
    return new PlainHistoryCell(collapsed);
  }

  const detailWidth = Math.max(1, Math.floor((width ?? 120) - 4));
  const rendered = format_and_truncate_tool_result(
    safeJson(item.toolCall.details) ?? String(item.toolCall.details),
    TOOL_CALL_MAX_LINES,
    detailWidth,
  );
  collapsed.push(textLine(`  └ ${rendered}`, { dim: true, clampLines: TOOL_CALL_MAX_LINES }));

  return new ExpandableHistoryCell({
    // Tool call kind is not part of the Phase-1 web HistoryCellKind union; keep it as plain.
    kind: "plain",
    collapsed,
    expanded: () => {
      const out = [...expanded];
      const detailLines = prettyValueLines(item.toolCall?.details);
      if (detailLines.length === 0) {
        out.push(textLine("  └ (no details)", { dim: true }));
        return out;
      }
      for (let idx = 0; idx < detailLines.length; idx += 1) {
        const prefix = idx === 0 ? "  └ " : "    ";
        out.push(textLine(`${prefix}${detailLines[idx] ?? ""}`, { dim: true }));
      }
      return out;
    },
  });
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export type TimelineRenderContext = {
  cwd: string;
  width: number | null;
};

export function timelineItemToHistoryCell(
  item: UiTimelineItem,
  context: TimelineRenderContext,
): HistoryCell {
  switch (item.itemType) {
    case "user-message":
      return renderUserItem(item);
    case "assistant-message":
      return renderAssistantItem(item, context.cwd, context.width);
    case "reasoning":
      return renderReasoningItem(item);
    case "exec":
      return renderExecItem(item, context.width);
    case "mcp-tool-call":
      return renderMcpItem(item, context.width);
    case "tool-call":
      return renderToolCallItem(item, context.width);
    case "worked":
      return renderWorkedItem(item);
    default:
      return new PlainHistoryCell([
        textLine(`• ${item.itemType}: ${item.text ?? ""}`, { dim: true }),
      ]);
  }
}

export type ChatWidgetRenderModel = {
  threadId: string;
  runtime: UiThreadRuntime;
  pendingRequests: UiServerRequest[];
  cells: HistoryCell[];
};

export class ChatWidget {
  private model: ChatWidgetRenderModel;
  private cwd: string;
  private width: number | null;
  private readonly interrupts = new InterruptManager();
  private seenPendingRequestIds = new Set<number>();

  constructor(opts?: { cwd?: string; width?: number | null }) {
    this.cwd = opts?.cwd ?? "";
    this.width = typeof opts?.width === "number" ? opts.width : null;
    this.model = {
      threadId: "",
      runtime: {
        inProgress: false,
        queuedCount: 0,
        interruptRequested: false,
        activeTurnId: null,
        lastError: null,
      },
      pendingRequests: [],
      cells: [],
    };
  }

  setCwd(cwd: string): void {
    this.cwd = cwd;
  }

  setWidth(width: number | null): void {
    this.width = width;
  }

  updateFromSnapshot(snapshot: UiTimelineSnapshot): void {
    this.enqueueInterruptsFromSnapshot(snapshot.pendingRequests);
    this.model = {
      threadId: snapshot.threadId,
      runtime: snapshot.runtime,
      pendingRequests: snapshot.pendingRequests,
      cells: snapshot.items.map((item) => this.renderItem(item)),
    };
  }

  getModel(): ChatWidgetRenderModel {
    return this.model;
  }

  flushInterruptQueue(consumer: InterruptConsumer): void {
    this.interrupts.flushAll(consumer);
  }

  private enqueueInterruptsFromSnapshot(pendingRequests: UiServerRequest[]): void {
    const nextSeen = new Set<number>();
    for (const request of pendingRequests) {
      nextSeen.add(request.id);
      if (!this.seenPendingRequestIds.has(request.id)) {
        this.interrupts.pushServerRequest(request);
      }
    }
    this.seenPendingRequestIds = nextSeen;
  }

  private renderItem(item: UiTimelineItem): HistoryCell {
    return timelineItemToHistoryCell(item, { cwd: this.cwd, width: this.width });
  }
}
