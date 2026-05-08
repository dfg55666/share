export const STATUS_DETAILS_DEFAULT_MAX_LINES = 3;

const DETAILS_PREFIX = "  └ ";

export type StatusDetailsCapitalization = "capitalize_first" | "preserve";

export type StatusIndicatorRenderModel = {
  headerLine: string;
  detailsLines: string[];
};

function capitalizeFirst(value: string): string {
  const trimmed = value.trimStart();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  const intValue = Math.trunc(value);
  return Math.max(min, Math.min(max, intValue));
}

// Format elapsed seconds into a compact human-friendly form used by the status line.
// Mirrors Rust examples: 0s, 59s, 1m 00s, 59m 59s, 1h 00m 00s, 2h 03m 09s
export function fmtElapsedCompact(elapsedSecs: number): string {
  const secs = clampInt(elapsedSecs, 0, Number.MAX_SAFE_INTEGER);
  if (secs < 60) {
    return `${secs}s`;
  }
  if (secs < 3600) {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

function wrapText(text: string, width: number): string[] {
  const limit = clampInt(width, 1, 10_000);
  const out: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (line.length <= limit) {
      out.push(line);
      continue;
    }

    let cursor = 0;
    while (cursor < line.length) {
      out.push(line.slice(cursor, cursor + limit));
      cursor += limit;
    }
  }
  return out;
}

export class StatusIndicatorWidget {
  private header = "Working";
  private details: string | null = null;
  private detailsMaxLines = STATUS_DETAILS_DEFAULT_MAX_LINES;
  private inlineMessage: string | null = null;
  private showInterruptHint = true;

  private elapsedRunningMs = 0;
  private lastResumeAtMs = Date.now();
  private paused = false;

  constructor(
    private readonly options: {
      onInterrupt?: () => void;
      animationsEnabled?: boolean;
    } = {},
  ) {}

  public interrupt(): void {
    this.options.onInterrupt?.();
  }

  public updateHeader(header: string): void {
    const trimmed = header.trim();
    this.header = trimmed || "Working";
  }

  public updateDetails(
    details: string | null | undefined,
    capitalization: StatusDetailsCapitalization,
    maxLines: number,
  ): void {
    this.detailsMaxLines = Math.max(1, clampInt(maxLines, 1, 100));
    const raw = typeof details === "string" ? details : "";
    const trimmed = raw.trimStart();
    if (!trimmed) {
      this.details = null;
      return;
    }
    this.details =
      capitalization === "capitalize_first" ? capitalizeFirst(trimmed) : trimmed;
  }

  public updateInlineMessage(message: string | null | undefined): void {
    const trimmed = typeof message === "string" ? message.trim() : "";
    this.inlineMessage = trimmed ? trimmed : null;
  }

  public setInterruptHintVisible(visible: boolean): void {
    this.showInterruptHint = Boolean(visible);
  }

  public pauseTimer(nowMs = Date.now()): void {
    if (this.paused) return;
    this.elapsedRunningMs += Math.max(0, nowMs - this.lastResumeAtMs);
    this.paused = true;
  }

  public resumeTimer(nowMs = Date.now()): void {
    if (!this.paused) return;
    this.lastResumeAtMs = nowMs;
    this.paused = false;
  }

  public elapsedSeconds(nowMs = Date.now()): number {
    const elapsedMs = this.paused
      ? this.elapsedRunningMs
      : this.elapsedRunningMs + Math.max(0, nowMs - this.lastResumeAtMs);
    return Math.floor(elapsedMs / 1000);
  }

  public render(width: number): StatusIndicatorRenderModel {
    const w = clampInt(width, 1, 10_000);
    const elapsed = fmtElapsedCompact(this.elapsedSeconds());

    const hint = this.showInterruptHint ? `${elapsed} • Esc to interrupt` : elapsed;
    const suffix = this.inlineMessage ? ` ${this.inlineMessage}` : "";
    const headerLine = `${this.header} (${hint})${suffix}`;

    const detailsLines: string[] = [];
    if (this.details) {
      const contentWidth = Math.max(1, w - DETAILS_PREFIX.length);
      const wrapped = wrapText(this.details, contentWidth);
      const limited = wrapped.slice(0, this.detailsMaxLines);
      for (const line of limited) {
        detailsLines.push(`${DETAILS_PREFIX}${line}`);
      }
      if (wrapped.length > limited.length && detailsLines.length > 0) {
        // Mark truncation with an ellipsis (matches TUI intent; exact glyph differs).
        const lastIndex = detailsLines.length - 1;
        detailsLines[lastIndex] = `${detailsLines[lastIndex].slice(0, Math.max(0, w - 1))}…`;
      }
    }

    return { headerLine, detailsLines };
  }
}

