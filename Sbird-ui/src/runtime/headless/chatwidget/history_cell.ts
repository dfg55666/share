// Port baseline of `tuitoweb/src/history_cell.rs` for the web runtime.
//
// The Rust TUI models the transcript as a list of HistoryCell render units.
// For Phase 1 we keep the same abstraction but emit a lightweight `RtLine[]`
// model that the React layer can render into DOM.

import { prefixLines, type RtLine, type RtSpan } from "../render/line_utils";

export type HistoryCellKind =
  | "session_info"
  | "user_message"
  | "agent_message"
  | "reasoning"
  | "exec"
  | "mcp_tool_call"
  | "plan"
  | "plain";

export type UserTextElement = {
  byteRange: { start: number; end: number };
  placeholder?: string | null;
};

export interface HistoryCell {
  kind: HistoryCellKind;
  displayLines(width: number): RtLine[];
  transcriptLines?(width: number): RtLine[];
  isStreamContinuation?(): boolean;
  transcriptAnimationTick?(): number | null;
}

export class ExpandableHistoryCell implements HistoryCell {
  public readonly kind: HistoryCellKind;
  private readonly collapsed: RtLine[];
  private readonly expanded: RtLine[] | ((width: number) => RtLine[]);
  private expandedCache: { width: number; lines: RtLine[] } | null = null;

  constructor(args: {
    kind: HistoryCellKind;
    collapsed: RtLine[];
    expanded: RtLine[] | ((width: number) => RtLine[]);
  }) {
    this.kind = args.kind;
    this.collapsed = args.collapsed;
    this.expanded = args.expanded;
  }

  displayLines(_width: number): RtLine[] {
    return this.collapsed;
  }

  transcriptLines(width: number): RtLine[] {
    if (Array.isArray(this.expanded)) {
      return this.expanded;
    }
    const cached = this.expandedCache;
    if (cached && cached.width === width) {
      return cached.lines;
    }
    const lines = this.expanded(width);
    this.expandedCache = { width, lines };
    return lines;
  }
}

export class SessionInfoCell implements HistoryCell {
  public readonly kind: HistoryCellKind = "session_info";
  private readonly lines: RtLine[];

  constructor(lines: RtLine[]) {
    this.lines = lines;
  }

  displayLines(_width: number): RtLine[] {
    return this.lines;
  }
}

export class UserHistoryCell implements HistoryCell {
  public readonly kind: HistoryCellKind = "user_message";
  public readonly message: string;
  public readonly textElements: UserTextElement[];
  public readonly localImagePaths: string[];
  public readonly remoteImageUrls: string[];

  constructor(args: {
    message: string;
    textElements?: UserTextElement[];
    localImagePaths?: string[];
    remoteImageUrls?: string[];
  }) {
    this.message = args.message;
    this.textElements = args.textElements ?? [];
    this.localImagePaths = args.localImagePaths ?? [];
    this.remoteImageUrls = args.remoteImageUrls ?? [];
  }

  displayLines(_width: number): RtLine[] {
    const lines: RtLine[] = [
      {
        spans: [{ content: "• " }, { content: "You", style: { bold: true } }],
      },
    ];

    const body = this.message.split("\n");
    for (const part of body) {
      lines.push({ spans: [{ content: `  ${part}` }] });
    }

    for (const imagePath of this.localImagePaths) {
      lines.push({ spans: [{ content: `  [image] ${imagePath}`, style: { dim: true } }] });
    }

    for (const imageUrl of this.remoteImageUrls) {
      lines.push({ spans: [{ content: `  [remote-image] ${imageUrl}`, style: { dim: true } }] });
    }

    return lines;
  }
}

export class AgentMessageCell implements HistoryCell {
  public readonly kind: HistoryCellKind = "agent_message";
  private readonly lines: RtLine[];
  private readonly isFirstLine: boolean;

  constructor(lines: RtLine[], isFirstLine: boolean) {
    this.lines = lines;
    this.isFirstLine = isFirstLine;
  }

  displayLines(_width: number): RtLine[] {
    const initialPrefix: RtSpan = {
      content: this.isFirstLine ? "• " : "  ",
      style: this.isFirstLine ? { dim: true } : undefined,
    };
    const subsequentPrefix: RtSpan = { content: "  " };
    return prefixLines(this.lines, initialPrefix, subsequentPrefix);
  }

  isStreamContinuation(): boolean {
    return !this.isFirstLine;
  }
}

export class PlanHistoryCell implements HistoryCell {
  public readonly kind: HistoryCellKind = "plan";
  private readonly lines: RtLine[];
  private readonly continuation: boolean;

  constructor(lines: RtLine[], isContinuation: boolean) {
    this.lines = lines;
    this.continuation = isContinuation;
  }

  displayLines(_width: number): RtLine[] {
    return this.lines;
  }

  isStreamContinuation(): boolean {
    return this.continuation;
  }
}

export class PlainHistoryCell implements HistoryCell {
  public readonly kind: HistoryCellKind = "plain";
  private readonly lines: RtLine[];

  constructor(lines: RtLine[]) {
    this.lines = lines;
  }

  displayLines(_width: number): RtLine[] {
    return this.lines;
  }
}
