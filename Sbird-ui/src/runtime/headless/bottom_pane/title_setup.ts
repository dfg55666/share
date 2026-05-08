// Web Phase 1 port of `tuitoweb/src/bottom_pane/title_setup.rs`.

export type TerminalTitleItem =
  | "app-name"
  | "project"
  | "spinner"
  | "status"
  | "thread"
  | "git-branch"
  | "model"
  | "task-progress";

export function terminalTitleItemDescription(item: TerminalTitleItem): string {
  switch (item) {
    case "app-name":
      return "Codex app name";
    case "project":
      return "Project name (falls back to current directory name)";
    case "spinner":
      return "Animated task spinner (omitted while idle or when animations are off)";
    case "status":
      return "Compact session status text (Ready, Working, Thinking)";
    case "thread":
      return "Current thread title (omitted until available)";
    case "git-branch":
      return "Current Git branch (omitted when unavailable)";
    case "model":
      return "Current model name";
    case "task-progress":
      return "Latest task progress from update_plan (omitted until available)";
  }
}

export function terminalTitleItemPreviewExample(item: TerminalTitleItem): string {
  switch (item) {
    case "app-name":
      return "codex";
    case "project":
      return "my-project";
    case "spinner":
      return "⠋";
    case "status":
      return "Working";
    case "thread":
      return "Investigate flaky test";
    case "git-branch":
      return "feat/awesome-feature";
    case "model":
      return "gpt-5.2-codex";
    case "task-progress":
      return "Tasks 2/5";
  }
}

export function separatorFromPrevious(
  item: TerminalTitleItem,
  previous: TerminalTitleItem | null,
): string {
  if (!previous) return "";
  if (previous === "spinner" || item === "spinner") return " ";
  return " | ";
}

export class TerminalTitleSetupView {
  private items: TerminalTitleItem[] = [];

  constructor(initial: TerminalTitleItem[] | null) {
    this.items = initial ? [...initial] : [];
  }

  selectedItems(): TerminalTitleItem[] {
    return this.items;
  }

  setSelectedItems(items: TerminalTitleItem[]): void {
    this.items = [...items];
  }

  previewTitle(): string | null {
    let out = "";
    let prev: TerminalTitleItem | null = null;
    for (const item of this.items) {
      out += separatorFromPrevious(item, prev);
      out += terminalTitleItemPreviewExample(item);
      prev = item;
    }
    return out ? out : null;
  }
}
