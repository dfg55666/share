// Port subset of `tuitoweb/src/chatwidget/status_surfaces.rs`.
//
// The upstream TUI renders status-line and terminal-title segments based on runtime state.
// Web Phase 1 does not control the terminal title, but we keep the same constants and provide
// helpers for displaying an equivalent status surface inside the web UI.

export const DEFAULT_TERMINAL_TITLE_ITEMS = ["spinner", "project"] as const;

export const TERMINAL_TITLE_SPINNER_FRAMES = [
  "⠋",
  "⠙",
  "⠹",
  "⠸",
  "⠼",
  "⠴",
  "⠦",
  "⠧",
  "⠇",
  "⠏",
] as const;

export const TERMINAL_TITLE_SPINNER_INTERVAL_MS = 100;

export type TerminalTitleStatusKind =
  | "Working"
  | "WaitingForBackgroundTerminal"
  | "Undoing"
  | "Thinking";

export type TerminalTitleItem =
  | "spinner"
  | "project"
  | "status"
  | "thread"
  | "model"
  | "git-branch";

export type TerminalTitleBuildArgs = {
  nowMs: number;
  items: TerminalTitleItem[];
  statusKind?: TerminalTitleStatusKind;
  projectName?: string | null;
  threadTitle?: string | null;
  modelName?: string | null;
  gitBranch?: string | null;
  spinnerEnabled?: boolean;
};

export function terminalTitleSpinnerFrame(nowMs: number): string {
  const idx =
    Math.floor(Math.max(0, nowMs) / TERMINAL_TITLE_SPINNER_INTERVAL_MS) %
    TERMINAL_TITLE_SPINNER_FRAMES.length;
  return TERMINAL_TITLE_SPINNER_FRAMES[idx] ?? "⠋";
}

export function terminalTitleStatusLabel(kind: TerminalTitleStatusKind): string {
  switch (kind) {
    case "Working":
      return "Working";
    case "WaitingForBackgroundTerminal":
      return "Waiting";
    case "Undoing":
      return "Undoing";
    case "Thinking":
    default:
      return "Thinking";
  }
}

function separator(previous: TerminalTitleItem | null, current: TerminalTitleItem): string {
  if (!previous) return "";
  if (previous === "spinner" || current === "spinner") return " ";
  return " | ";
}

export function buildTerminalTitle(args: TerminalTitleBuildArgs): string | null {
  const statusKind = args.statusKind ?? "Thinking";
  const spinnerEnabled = args.spinnerEnabled ?? true;
  let title = "";
  let previous: TerminalTitleItem | null = null;

  for (const item of args.items) {
    let value = "";
    switch (item) {
      case "spinner":
        value = spinnerEnabled ? terminalTitleSpinnerFrame(args.nowMs) : "";
        break;
      case "project":
        value = args.projectName ?? "";
        break;
      case "status":
        value = terminalTitleStatusLabel(statusKind);
        break;
      case "thread":
        value = args.threadTitle ?? "";
        break;
      case "model":
        value = args.modelName ?? "";
        break;
      case "git-branch":
        value = args.gitBranch ?? "";
        break;
    }

    if (!value) continue;
    title += separator(previous, item);
    title += value;
    previous = item;
  }

  return title || null;
}

export function shouldAnimateTerminalTitleSpinner(kind: TerminalTitleStatusKind): boolean {
  return kind === "Working" || kind === "Undoing" || kind === "Thinking";
}
