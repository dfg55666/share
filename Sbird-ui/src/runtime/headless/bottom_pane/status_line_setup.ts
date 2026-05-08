// Web Phase 1 port of `tuitoweb/src/bottom_pane/status_line_setup.rs`.
//
// This keeps the status-line item vocabulary and preview data shape. Rendering and persistence
// are handled by the React layer / settings module in later phases.

export type StatusLineItem =
  | "model-name"
  | "model-with-reasoning"
  | "current-dir"
  | "project-root"
  | "git-branch"
  | "context-remaining"
  | "context-used"
  | "five-hour-limit"
  | "weekly-limit"
  | "codex-version"
  | "context-window-size"
  | "used-tokens"
  | "total-input-tokens"
  | "total-output-tokens"
  | "session-id"
  | "fast-mode";

export function statusLineItemDescription(item: StatusLineItem): string {
  switch (item) {
    case "model-name":
      return "Current model name";
    case "model-with-reasoning":
      return "Current model name with reasoning level";
    case "current-dir":
      return "Current working directory";
    case "project-root":
      return "Project root directory (omitted when unavailable)";
    case "git-branch":
      return "Current Git branch (omitted when unavailable)";
    case "context-remaining":
      return "Percentage of context window remaining (omitted when unknown)";
    case "context-used":
      return "Percentage of context window used (omitted when unknown)";
    case "five-hour-limit":
      return "Remaining usage on 5-hour usage limit (omitted when unavailable)";
    case "weekly-limit":
      return "Remaining usage on weekly usage limit (omitted when unavailable)";
    case "codex-version":
      return "Codex application version";
    case "context-window-size":
      return "Total context window size in tokens (omitted when unknown)";
    case "used-tokens":
      return "Total tokens used in session (omitted when zero)";
    case "total-input-tokens":
      return "Total input tokens used in session";
    case "total-output-tokens":
      return "Total output tokens used in session";
    case "session-id":
      return "Current session identifier (omitted until session starts)";
    case "fast-mode":
      return "Whether Fast mode is currently active";
  }
}

export class StatusLinePreviewData {
  private readonly values: Partial<Record<StatusLineItem, string>>;

  constructor(values: Partial<Record<StatusLineItem, string>>) {
    this.values = values;
  }

  lineForItems(items: StatusLineItem[]): string | null {
    const parts = items.map((item) => this.values[item]).filter((x): x is string => !!x);
    return parts.length ? parts.join(" · ") : null;
  }
}

export class StatusLineSetupView {
  private items: StatusLineItem[];

  constructor(statusLineItems: StatusLineItem[] | null) {
    this.items = statusLineItems ? [...statusLineItems] : [];
  }

  selectedItems(): StatusLineItem[] {
    return this.items;
  }

  setSelectedItems(items: StatusLineItem[]): void {
    this.items = [...items];
  }
}
