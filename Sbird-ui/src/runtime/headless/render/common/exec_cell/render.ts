import { stripBashLcAndEscape } from "../exec_command";
import type { CommandOutput, ExecCall } from "./model";
import { ExecCell, isUnifiedExecInteraction } from "./model";

export const TOOL_CALL_MAX_LINES = 5;
const USER_SHELL_TOOL_CALL_MAX_LINES = 50;
const MAX_INTERACTION_PREVIEW_CHARS = 80;

export type OutputLinesParams = {
  lineLimit: number;
  onlyErr: boolean;
  includeAnglePipe: boolean;
  includePrefix: boolean;
};

export type OutputLines = {
  lines: string[];
  omitted: number | null;
};

function splitLines(value: string): string[] {
  if (!value) return [];
  return value.replace(/\r\n/g, "\n").split("\n");
}

export function outputLines(
  output: CommandOutput | undefined,
  params: OutputLinesParams,
): OutputLines {
  const { lineLimit, onlyErr, includeAnglePipe, includePrefix } = params;

  if (!output) {
    return { lines: [], omitted: null };
  }

  if (onlyErr && output.exitCode === 0) {
    return { lines: [], omitted: null };
  }

  const src = output.aggregatedOutput ?? "";
  const lines = splitLines(src);
  const total = lines.length;
  const limit = Math.max(0, Math.floor(lineLimit));
  const headEnd = Math.min(total, limit);

  const out: string[] = [];

  for (let i = 0; i < headEnd; i += 1) {
    const raw = lines[i] ?? "";
    const prefix = !includePrefix
      ? ""
      : i === 0 && includeAnglePipe
        ? "  └ "
        : "    ";
    out.push(`${prefix}${raw}`);
  }

  const showEllipsis = total > 2 * limit && limit > 0;
  const omitted = showEllipsis ? total - 2 * limit : null;
  if (showEllipsis) {
    out.push(`… +${omitted} lines`);
  }

  const tailStart = showEllipsis ? total - limit : headEnd;
  for (let i = tailStart; i < total; i += 1) {
    const raw = lines[i] ?? "";
    const prefix = includePrefix ? "    " : "";
    out.push(`${prefix}${raw}`);
  }

  return { lines: out, omitted };
}

export function spinner(
  startTimeMs: number | undefined,
  animationsEnabled: boolean,
  nowMs: number = Date.now(),
): string {
  if (!animationsEnabled) {
    return "•";
  }
  if (typeof startTimeMs !== "number") {
    return "•";
  }
  const elapsedMs = Math.max(0, nowMs - startTimeMs);
  const blinkOn = Math.floor(elapsedMs / 600) % 2 === 0;
  return blinkOn ? "•" : "◦";
}

export function newActiveExecCommand(args: {
  callId: string;
  command: string[];
  parsed: Array<{ kind: string; [key: string]: unknown }>;
  source: "agent" | "user_shell" | "unified_exec_interaction" | "unknown";
  interactionInput?: string;
  animationsEnabled: boolean;
  nowMs?: number;
}): ExecCell {
  const nowMs = args.nowMs ?? Date.now();
  return new ExecCell(
    {
      callId: args.callId,
      command: args.command,
      parsed: args.parsed.map((entry) => ({ kind: "unknown", raw: entry })),
      output: undefined,
      source: args.source,
      startTimeMs: nowMs,
      durationMs: undefined,
      interactionInput: args.interactionInput,
    },
    args.animationsEnabled,
  );
}

function formatDurationCompact(durationMs: number | undefined): string {
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs) || durationMs < 0) {
    return "unknown";
  }
  const totalSeconds = Math.floor(durationMs / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  if (totalSeconds < 3600) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes.toString().padStart(2, "0")}m ${seconds
    .toString()
    .padStart(2, "0")}s`;
}

function summarizeInteractionInput(input: string): string {
  const singleLine = input.replace(/\n/g, "\\n");
  const sanitized = singleLine.replace(/`/g, "\\`");
  if (sanitized.length <= MAX_INTERACTION_PREVIEW_CHARS) {
    return sanitized;
  }
  return `${sanitized.slice(0, MAX_INTERACTION_PREVIEW_CHARS)}...`;
}

function formatUnifiedExecInteraction(command: string[], input?: string): string {
  const commandDisplay = stripBashLcAndEscape(command);
  if (input && input.length > 0) {
    const preview = summarizeInteractionInput(input);
    return `Interacted with \`${commandDisplay}\`, sent \`${preview}\``;
  }
  return `Waited for \`${commandDisplay}\``;
}

export function execTranscriptLines(cell: ExecCell): string[] {
  const lines: string[] = [];

  const calls = Array.from(cell.iterCalls());
  for (let i = 0; i < calls.length; i += 1) {
    const call = calls[i];
    if (i > 0) {
      lines.push("");
    }

    const script = stripBashLcAndEscape(call.command);
    lines.push(`$ ${script}`);

    if (call.output) {
      if (isUnifiedExecInteraction(call)) {
        lines.push(formatUnifiedExecInteraction(call.command, call.interactionInput));
      } else if (call.output.formattedOutput) {
        for (const raw of splitLines(call.output.formattedOutput)) {
          lines.push(raw);
        }
      }

      const duration = formatDurationCompact(call.durationMs);
      if (call.output.exitCode === 0) {
        lines.push(`✓ • ${duration}`);
      } else {
        lines.push(`✗ (${call.output.exitCode}) • ${duration}`);
      }
    }
  }

  return lines;
}

export function execSummaryLines(cell: ExecCell): string[] {
  if (cell.isExploringCell()) {
    const head = cell.isActive() ? "Exploring" : "Explored";
    const dot = cell.isActive() ? spinner(cell.activeStartTimeMs(), cell.animationsEnabled()) : "•";
    const lines = [`${dot} ${head}`];

    const calls = Array.from(cell.iterCalls());
    for (const call of calls) {
      const script = stripBashLcAndEscape(call.command);
      lines.push(`  - ${script}`);
    }
    return lines;
  }

  const calls = Array.from(cell.iterCalls());
  if (calls.length === 0) return [];
  const call = calls[calls.length - 1] as ExecCall;

  const dot = cell.isActive() ? spinner(cell.activeStartTimeMs(), cell.animationsEnabled()) : "•";
  const title = cell.isActive() ? "Running" : "Ran";
  const script = stripBashLcAndEscape(call.command);
  const out = [`${dot} ${title}: ${script}`];

  const maxLines = call.source === "user_shell" ? USER_SHELL_TOOL_CALL_MAX_LINES : TOOL_CALL_MAX_LINES;
  const output = outputLines(call.output, {
    lineLimit: maxLines,
    onlyErr: false,
    includeAnglePipe: true,
    includePrefix: true,
  });
  out.push(...output.lines);

  return out;
}
